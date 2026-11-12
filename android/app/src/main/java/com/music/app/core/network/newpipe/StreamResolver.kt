package com.music.app.core.network.newpipe

import android.net.Uri
import android.util.Log
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import org.schabi.newpipe.extractor.ServiceList
import org.schabi.newpipe.extractor.stream.AudioStream
import org.schabi.newpipe.extractor.stream.StreamInfo
import java.net.InetAddress
import java.net.URLDecoder
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

object StreamResolver {
    private const val TAG = "StreamResolver"
    private const val CACHE_TTL_MS = 3 * 60 * 60 * 1000L // 3 hours
    private const val MAX_RESOLVE_RETRIES = 3
    private val RETRY_DELAYS_MS = longArrayOf(0, 1500, 3000)

    /**
     * Custom DNS resolver identical to NewPipeOkHttpDownloader.reliableDns.
     * Falls back to Google DoH JSON API when the system DNS fails (common with VPNs).
     */
    private val reliableDns = object : okhttp3.Dns {
        override fun lookup(hostname: String): List<InetAddress> {
            try {
                val systemResult = okhttp3.Dns.SYSTEM.lookup(hostname)
                if (systemResult.isNotEmpty()) return systemResult
            } catch (_: Exception) {}

            try {
                val url = "https://dns.google/resolve?name=$hostname&type=A"
                val req = Request.Builder().url(url)
                    .header("Accept", "application/dns-json")
                    .build()
                val fallbackClient = OkHttpClient.Builder()
                    .connectTimeout(5, TimeUnit.SECONDS)
                    .readTimeout(5, TimeUnit.SECONDS)
                    .build()
                val resp = fallbackClient.newCall(req).execute()
                val body = resp.body?.string() ?: ""
                resp.close()
                val json = JSONObject(body)
                val answers = json.optJSONArray("Answer")
                if (answers != null && answers.length() > 0) {
                    val ips = mutableListOf<InetAddress>()
                    for (i in 0 until answers.length()) {
                        val data = answers.optJSONObject(i)?.optString("data") ?: continue
                        try { ips.add(InetAddress.getByName(data)) } catch (_: Exception) {}
                    }
                    if (ips.isNotEmpty()) return ips
                }
            } catch (_: Exception) {}

            return InetAddress.getAllByName(hostname).toList()
        }
    }

    private val httpClient = OkHttpClient.Builder()
        .dns(reliableDns)
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .followRedirects(true)
        .retryOnConnectionFailure(true)
        .build()

    private data class CachedStream(
        val url: String,
        val timestamp: Long = System.currentTimeMillis()
    )

    private val streamCache = ConcurrentHashMap<String, CachedStream>()
    private val trackToVideoIdMap = ConcurrentHashMap<String, String>()

    private fun getTrackKey(artist: String, title: String): String {
        return "${artist.lowercase().trim()}:::${title.lowercase().trim()}"
    }

    fun getCachedVideoId(trackId: String): String? = trackToVideoIdMap[trackId]

    /**
     * Finds YouTube videoId for a given track using official YouTube search.
     * Matches localhost reference-web StreamResolverService.resolveFullStream.
     */
    suspend fun findMatchingVideoId(artist: String, title: String): String? = withContext(Dispatchers.IO) {
        val key = getTrackKey(artist, title)
        val cached = trackToVideoIdMap[key]
        if (!cached.isNullOrEmpty()) return@withContext cached

        val query = "$artist $title"
        try {
            ensureActive()
            val endpoint = "https://www.youtube.com/youtubei/v1/search"
            val postJson = JSONObject().apply {
                put(
                    "context",
                    JSONObject().apply {
                        put(
                            "client",
                            JSONObject().apply {
                                put("clientName", "WEB")
                                put("clientVersion", "2.20240101.00.00")
                                put("hl", "en")
                                put("gl", "US")
                            }
                        )
                    }
                )
                put("query", query)
            }

            val request = Request.Builder()
                .url(endpoint)
                .header("Content-Type", "application/json")
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .post(postJson.toString().toRequestBody("application/json".toMediaType()))
                .build()

            val response = httpClient.newCall(request).execute()
            if (!response.isSuccessful) return@withContext null

            val body = response.body?.string() ?: return@withContext null
            val data = JSONObject(body)
            val sections = data.optJSONObject("contents")
                ?.optJSONObject("twoColumnSearchResultsRenderer")
                ?.optJSONObject("primaryContents")
                ?.optJSONObject("sectionListRenderer")
                ?.optJSONArray("contents") ?: return@withContext null

            for (s in 0 until sections.length()) {
                val sec = sections.optJSONObject(s) ?: continue
                val items = sec.optJSONObject("itemSectionRenderer")?.optJSONArray("contents") ?: continue
                for (i in 0 until items.length()) {
                    val it = items.optJSONObject(i) ?: continue
                    val v = it.optJSONObject("videoRenderer") ?: continue
                    val vid = v.optString("videoId")
                    if (vid.isNotEmpty()) {
                        Log.i(TAG, "Matched '$query' -> videoId=$vid")
                        trackToVideoIdMap[key] = vid
                        return@withContext vid
                    }
                }
            }
            null
        } catch (ce: CancellationException) {
            throw ce
        } catch (e: Exception) {
            Log.w(TAG, "findMatchingVideoId failed for '$query': ${e.message}")
            null
        }
    }

    /**
     * Pre-match and warm videoId & stream cache for a track in the background.
     */
    suspend fun prefetchTrack(trackId: String, title: String, artist: String) = withContext(Dispatchers.IO) {
        try {
            val vid = findMatchingVideoId(artist, title)
            if (!vid.isNullOrEmpty()) {
                trackToVideoIdMap[trackId] = vid
                prefetch(vid)
            }
        } catch (_: Exception) {}
    }

    /**
     * Resolves the direct audio stream URL with the highest bitrate compatible with ExoPlayer.
     * Supports both direct videoIds and `itunes://...` queries.
     * Runs strictly on Dispatchers.IO with full cancellation support.
     */
    suspend fun resolveStreamUrl(identifier: String, forceRefresh: Boolean = false): String? = withContext(Dispatchers.IO) {
        val trimmed = identifier.removePrefix("yt-").trim()
        if (trimmed.isEmpty()) return@withContext null

        var videoId = trimmed
        if (trimmed.startsWith("itunes-") || trimmed.contains("artist=") || trimmed.contains("title=")) {
            // Parse iTunes query parameters
            try {
                val uri = Uri.parse(if (trimmed.startsWith("itunes://")) trimmed else "itunes://$trimmed")
                val trackId = uri.host ?: uri.path?.removePrefix("/") ?: trimmed
                val artist = uri.getQueryParameter("artist")?.let { URLDecoder.decode(it, "UTF-8") } ?: ""
                val title = uri.getQueryParameter("title")?.let { URLDecoder.decode(it, "UTF-8") } ?: ""

                var matchedVid = trackToVideoIdMap[trackId]
                if (matchedVid.isNullOrEmpty() && artist.isNotEmpty() && title.isNotEmpty()) {
                    matchedVid = trackToVideoIdMap[getTrackKey(artist, title)]
                }
                if (matchedVid.isNullOrEmpty() && artist.isNotEmpty() && title.isNotEmpty()) {
                    matchedVid = findMatchingVideoId(artist, title)
                }

                if (!matchedVid.isNullOrEmpty()) {
                    trackToVideoIdMap[trackId] = matchedVid
                    videoId = matchedVid
                } else {
                    Log.w(TAG, "Could not match YouTube videoId for iTunes track: $trimmed")
                    return@withContext null
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error parsing itunes identifier: $trimmed", e)
                return@withContext null
            }
        }

        if (!forceRefresh) {
            val cached = streamCache[videoId]
            if (cached != null && (System.currentTimeMillis() - cached.timestamp < CACHE_TTL_MS)) {
                return@withContext cached.url
            }
        }

        try {
            ensureActive()
            val watchUrl = "https://www.youtube.com/watch?v=$videoId"
            val service = ServiceList.YouTube

            var lastException: Exception? = null
            for (attempt in 0 until MAX_RESOLVE_RETRIES) {
                ensureActive()
                if (attempt > 0) {
                    val delayMs = RETRY_DELAYS_MS.getOrElse(attempt) { 3000L }
                    Log.w(TAG, "Retry #$attempt for $videoId after ${delayMs}ms...")
                    kotlinx.coroutines.delay(delayMs)
                }
                try {
                    val streamInfo = StreamInfo.getInfo(service, watchUrl)

                    ensureActive()
                    val audioStreams: List<AudioStream> = streamInfo.audioStreams ?: emptyList()
                    if (audioStreams.isEmpty()) {
                        Log.w(TAG, "No audio streams found for $videoId (attempt $attempt)")
                        continue
                    }

                    // Pick highest quality audio stream (prioritizing highest averageBitrate)
                    val bestAudio = audioStreams.maxByOrNull { it.averageBitrate }
                    val directUrl = bestAudio?.url ?: bestAudio?.content

                    if (!directUrl.isNullOrEmpty()) {
                        streamCache[videoId] = CachedStream(directUrl)
                        return@withContext directUrl
                    } else {
                        Log.w(TAG, "Best audio stream URL was null for $videoId (attempt $attempt)")
                    }
                } catch (ce: CancellationException) {
                    throw ce
                } catch (e: Exception) {
                    lastException = e
                    Log.w(TAG, "Resolve attempt $attempt failed for $videoId: ${e.message}")
                }
            }

            Log.e(TAG, "Failed to resolve stream for videoId: $videoId after $MAX_RESOLVE_RETRIES attempts", lastException)
            return@withContext null
        } catch (ce: CancellationException) {
            throw ce
        } catch (e: Exception) {
            Log.e(TAG, "Failed to resolve stream for videoId: $videoId", e)
            return@withContext null
        }
    }

    /**
     * Invalidate cache for a specific videoId (e.g. on HTTP 403 or playback error).
     */
    fun invalidate(videoId: String) {
        val cleanVideoId = videoId.removePrefix("yt-").trim()
        streamCache.remove(cleanVideoId)
    }

    /**
     * Pre-fetch stream URL in the background for gapless playback of the next track in queue.
     */
    suspend fun prefetch(videoId: String) {
        withContext(Dispatchers.IO) {
            try {
                resolveStreamUrl(videoId, forceRefresh = false)
            } catch (_: Exception) {}
        }
    }
}
