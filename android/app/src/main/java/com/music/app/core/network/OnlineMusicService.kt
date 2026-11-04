package com.music.app.core.network

import com.music.app.core.model.MoodType
import com.music.app.core.model.Track
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.net.URLEncoder
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import java.util.regex.Pattern

object OnlineMusicService {

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(12, TimeUnit.SECONDS)
        .followRedirects(true)
        .build()

    private val postMp3Cache = ConcurrentHashMap<String, String>()
    private val youtubeStreamCache = ConcurrentHashMap<String, String>()

    // Candidate proxy backend hosts matching reference-web
    private val CANDIDATE_HOSTS = listOf(
        "http://127.0.0.1:3000",
        "http://10.0.2.2:3000",
        "http://192.168.1.57:3000"
    )

    @Volatile
    private var detectedBackendHost: String? = null

    private const val USER_AGENT = "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"

    /**
     * Checks if a string contains Persian/Arabic characters.
     */
    fun isPersianText(text: String): Boolean {
        for (char in text) {
            val block = Character.UnicodeBlock.of(char)
            if (block == Character.UnicodeBlock.ARABIC ||
                block == Character.UnicodeBlock.ARABIC_SUPPLEMENT ||
                block == Character.UnicodeBlock.ARABIC_EXTENDED_A
            ) {
                return true
            }
        }
        return false
    }

    /**
     * Parse duration text like "3:45" or "1:02:15" to seconds.
     */
    private fun parseDurationText(text: String): Int {
        val parts = text.split(":").mapNotNull { it.toIntOrNull() }
        return when (parts.size) {
            2 -> parts[0] * 60 + parts[1]
            3 -> parts[0] * 3600 + parts[1] * 60 + parts[2]
            else -> 210
        }
    }

    /**
     * Probes candidate backend hosts to detect active Vite proxy.
     */
    suspend fun probeBackendHost(): String? = withContext(Dispatchers.IO) {
        val current = detectedBackendHost
        if (current != null) return@withContext current

        for (host in CANDIDATE_HOSTS) {
            try {
                val req = Request.Builder()
                    .url("$host/api/health")
                    .build()
                val res = client.newCall(req).execute()
                if (res.isSuccessful) {
                    detectedBackendHost = host
                    return@withContext host
                }
            } catch (_: Exception) {}
        }
        null
    }

    /**
     * Main search function integrating YouTube Music & Full Audio Streams.
     */
    suspend fun search(query: String, isNationalNet: Boolean): List<Track> = withContext(Dispatchers.IO) {
        val trimmed = query.trim()
        if (trimmed.isEmpty()) return@withContext emptyList()

        if (isNationalNet) {
            val musicDelResults = searchMusicDel(trimmed)
            if (musicDelResults.isNotEmpty()) {
                return@withContext musicDelResults
            }
            return@withContext filterVerifiedIranCatalog(trimmed)
        }

        // International search: Query YouTube Music & MusicDel concurrently
        coroutineScope {
            val ytDeferred = async { searchYouTube(trimmed) }
            val musicDelDeferred = async { searchMusicDel(trimmed) }

            val ytResults = try { ytDeferred.await() } catch (e: Exception) { emptyList() }
            val musicDelResults = try { musicDelDeferred.await() } catch (e: Exception) { emptyList() }

            val combined = mutableListOf<Track>()
            val isPersian = isPersianText(trimmed)

            if (isPersian) {
                combined.addAll(musicDelResults)
                combined.addAll(ytResults)
            } else {
                combined.addAll(ytResults)
                combined.addAll(musicDelResults)
            }

            combined
        }
    }

    /**
     * Search genuine full-length YouTube songs using InnerTube API.
     */
    suspend fun searchYouTube(query: String, limit: Int = 12): List<Track> = withContext(Dispatchers.IO) {
        val trimmed = query.trim()
        if (trimmed.isEmpty()) return@withContext emptyList()

        try {
            val url = "https://www.youtube.com/youtubei/v1/search"
            val jsonPayload = JSONObject().apply {
                put("context", JSONObject().apply {
                    put("client", JSONObject().apply {
                        put("clientName", "WEB")
                        put("clientVersion", "2.20240101.00.00")
                        put("hl", "en")
                        put("gl", "US")
                    })
                })
                put("query", trimmed)
            }

            val requestBody = jsonPayload.toString().toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url(url)
                .post(requestBody)
                .header("User-Agent", USER_AGENT)
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) return@withContext emptyList()

            val body = response.body?.string() ?: return@withContext emptyList()
            val root = JSONObject(body)
            val tracks = mutableListOf<Track>()

            val contents = root.optJSONObject("contents")
                ?.optJSONObject("twoColumnSearchResultsRenderer")
                ?.optJSONObject("primaryContents")
                ?.optJSONObject("sectionListRenderer")
                ?.optJSONArray("contents") ?: return@withContext emptyList()

            for (i in 0 until contents.length()) {
                val sec = contents.optJSONObject(i)?.optJSONObject("itemSectionRenderer") ?: continue
                val items = sec.optJSONArray("contents") ?: continue

                for (j in 0 until items.length()) {
                    val v = items.optJSONObject(j)?.optJSONObject("videoRenderer") ?: continue
                    val videoId = v.optString("videoId", "")
                    if (videoId.isEmpty()) continue

                    val titleRuns = v.optJSONObject("title")?.optJSONArray("runs")
                    val rawTitle = titleRuns?.let { runs ->
                        (0 until runs.length()).joinToString("") { runs.getJSONObject(it).optString("text", "") }
                    } ?: "Track"

                    val ownerRuns = v.optJSONObject("ownerText")?.optJSONArray("runs")
                    val rawAuthor = ownerRuns?.let { runs ->
                        (0 until runs.length()).joinToString("") { runs.getJSONObject(it).optString("text", "") }
                    } ?: "Artist"

                    val lengthText = v.optJSONObject("lengthText")?.optString("simpleText", "3:30") ?: "3:30"
                    val durationSec = parseDurationText(lengthText)

                    // Skip ultra-long mix > 20 mins or short < 30 secs
                    if (durationSec > 1200 || durationSec < 30) continue

                    val coverUrl = "https://i.ytimg.com/vi/$videoId/hqdefault.jpg"

                    tracks.add(
                        Track(
                            id = "yt-$videoId",
                            title = rawTitle.replace(Regex("(?i)\\(official.*?\\)|\\[official.*?\\]"), "").trim(),
                            artist = rawAuthor.replace(Regex("(?i) - Topic$| - Official$|VEVO$"), "").trim(),
                            album = "YouTube Music",
                            duration = durationSec,
                            url = "https://www.youtube.com/watch?v=$videoId",
                            coverUrl = coverUrl,
                            isLiked = false,
                            isDownloaded = false,
                            isNationalNet = false,
                            collection = "YouTube Music"
                        )
                    )

                    if (tracks.size >= limit) break
                }
                if (tracks.size >= limit) break
            }

            tracks
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    /**
     * Resolves YouTube video stream to direct audio stream URL.
     */
    suspend fun resolveYouTubeStream(videoId: String): String? = withContext(Dispatchers.IO) {
        val cached = youtubeStreamCache[videoId]
        if (cached != null) return@withContext cached

        // 1. Probe local dev proxy first (/api/stream-info?v=...)
        val backend = probeBackendHost()
        if (backend != null) {
            try {
                val req = Request.Builder()
                    .url("$backend/api/stream-info?v=$videoId")
                    .build()
                val res = client.newCall(req).execute()
                if (res.isSuccessful) {
                    val json = JSONObject(res.body?.string() ?: "")
                    val streamUrl = json.optString("url", "")
                    if (streamUrl.isNotEmpty()) {
                        youtubeStreamCache[videoId] = streamUrl
                        return@withContext streamUrl
                    }
                }
            } catch (_: Exception) {}

            // Fallback direct stream endpoint on proxy
            val proxyStream = "$backend/api/stream?v=$videoId"
            youtubeStreamCache[videoId] = proxyStream
            return@withContext proxyStream
        }

        // 2. Query public fast fallback stream resolvers
        val fallbackResolvers = listOf(
            "https://pipedapi.kavin.rocks/streams/$videoId",
            "https://api.piped.yt/streams/$videoId"
        )

        for (endpoint in fallbackResolvers) {
            try {
                val req = Request.Builder()
                    .url(endpoint)
                    .header("User-Agent", USER_AGENT)
                    .build()
                val res = client.newCall(req).execute()
                if (res.isSuccessful) {
                    val json = JSONObject(res.body?.string() ?: "")
                    val audioStreams = json.optJSONArray("audioStreams")
                    if (audioStreams != null && audioStreams.length() > 0) {
                        val best = audioStreams.getJSONObject(0).optString("url", "")
                        if (best.isNotEmpty()) {
                            youtubeStreamCache[videoId] = best
                            return@withContext best
                        }
                    }
                }
            } catch (_: Exception) {}
        }

        null
    }

    /**
     * Search songs on musicdel.ir using the official suggest API.
     */
    suspend fun searchMusicDel(query: String): List<Track> = withContext(Dispatchers.IO) {
        val trimmed = query.trim()
        if (trimmed.isEmpty()) return@withContext emptyList()

        try {
            val encodedQuery = URLEncoder.encode(trimmed, "UTF-8")
            val url = "https://musicdel.ir/wp-content/themes/musicdel2/api/suggest.php?q=$encodedQuery"

            val request = Request.Builder()
                .url(url)
                .header("User-Agent", USER_AGENT)
                .header("Accept", "application/json, text/javascript, */*; q=0.01")
                .header("Referer", "https://musicdel.ir/")
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) return@withContext emptyList()

            val body = response.body?.string() ?: return@withContext emptyList()
            val jsonArray = JSONArray(body)
            val tracks = mutableListOf<Track>()
            val seenUrls = mutableSetOf<String>()

            for (i in 0 until jsonArray.length()) {
                val item = jsonArray.optJSONObject(i) ?: continue
                val postUrl = item.optString("u", "")
                val type = item.optString("tp", "")

                if (postUrl.isEmpty() || type == "artist" || postUrl.contains("/artist/") || postUrl.contains("/tag/")) {
                    continue
                }
                if (seenUrls.contains(postUrl)) continue
                seenUrls.add(postUrl)

                val rawTitle = item.optString("t", "")
                val cleanTitle = rawTitle.replace(Regex("(?i)^دانلود آهنگ\\s*"), "").trim()
                val artist = item.optString("a", "").trim()
                val rawImg = item.optString("img", "")
                val cleanCover = if (rawImg.isNotEmpty()) {
                    rawImg.replace(Regex("-\\d+x\\d+(\\.[a-zA-Z0-9]+)$"), "$1")
                } else null

                val idMatch = Regex("single-tracks/(\\d+)").find(postUrl)
                val id = idMatch?.groupValues?.get(1) ?: "musicdel-$i"

                tracks.add(
                    Track(
                        id = "musicdel-$id",
                        title = cleanTitle.ifEmpty { "Single Track" },
                        artist = artist.ifEmpty { "Artist" },
                        album = "MusicDel Original",
                        duration = 210,
                        url = postUrl,
                        coverUrl = cleanCover,
                        isLiked = false,
                        isDownloaded = false,
                        isNationalNet = true,
                        collection = "National Net"
                    )
                )
            }

            // Pre-resolve top 3 tracks to direct MP3 URLs
            coroutineScope {
                tracks.take(3).map { track ->
                    async {
                        val mp3Url = resolveMusicDelMp3(track.url)
                        if (mp3Url != null) {
                            track.copy(url = mp3Url)
                        } else {
                            track
                        }
                    }
                }.mapIndexed { index, deferred ->
                    try {
                        tracks[index] = deferred.await()
                    } catch (_: Exception) {}
                }
            }

            tracks
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    /**
     * Resolves the direct MP3 link (prioritizing 320kbps) from a musicdel single-tracks post URL.
     */
    suspend fun resolveMusicDelMp3(postUrl: String): String? = withContext(Dispatchers.IO) {
        if (postUrl.endsWith(".mp3", ignoreCase = true) || postUrl.contains(".mp3?", ignoreCase = true)) {
            return@withContext postUrl
        }

        val cached = postMp3Cache[postUrl]
        if (cached != null) return@withContext cached

        try {
            val request = Request.Builder()
                .url(postUrl)
                .header("User-Agent", USER_AGENT)
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .header("Referer", "https://musicdel.ir/")
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) return@withContext null

            val html = response.body?.string() ?: return@withContext null

            val mp3Pattern = Pattern.compile("""(?:data-url|href|src)=["']([^"']+\.mp3)["']""", Pattern.CASE_INSENSITIVE)
            val matcher = mp3Pattern.matcher(html)
            val mp3List = mutableListOf<String>()

            while (matcher.find()) {
                val found = matcher.group(1)
                if (found != null && !mp3List.contains(found)) {
                    mp3List.add(found)
                }
            }

            if (mp3List.isEmpty()) return@withContext null

            val bestMp3 = mp3List.find { it.contains("320") } ?: mp3List.first()
            postMp3Cache[postUrl] = bestMp3
            bestMp3
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    /**
     * Upgrades a track by resolving its audio stream URL (YouTube or MusicDel).
     */
    suspend fun resolveTrackAudio(track: Track): Track = withContext(Dispatchers.IO) {
        if (track.url.endsWith(".mp3", ignoreCase = true) ||
            track.url.contains(".mp3?", ignoreCase = true) ||
            track.url.contains("googlevideo.com") ||
            track.url.startsWith("content://") ||
            track.url.startsWith("file://")
        ) {
            return@withContext track
        }

        // YouTube video stream resolution
        if (track.id.startsWith("yt-") || track.url.contains("youtube.com")) {
            val videoId = if (track.id.startsWith("yt-")) {
                track.id.removePrefix("yt-")
            } else {
                track.url.substringAfter("v=").substringBefore("&")
            }

            val ytStream = resolveYouTubeStream(videoId)
            if (ytStream != null) {
                return@withContext track.copy(url = ytStream)
            }
        }

        // MusicDel MP3 post resolution
        if (track.url.startsWith("https://musicdel.ir") || track.url.contains("single-tracks")) {
            val directMp3 = resolveMusicDelMp3(track.url)
            if (directMp3 != null) {
                return@withContext track.copy(url = directMp3)
            }
        }

        track
    }

    private fun filterVerifiedIranCatalog(query: String): List<Track> {
        val q = query.lowercase().trim()
        return VERIFIED_IRAN_TRACKS.filter {
            it.title.lowercase().contains(q) ||
            it.artist.lowercase().contains(q) ||
            it.album.lowercase().contains(q)
        }
    }

    val VERIFIED_IRAN_TRACKS = listOf(
        Track(
            id = "iran-verified-1",
            title = "Bi To Hargez",
            artist = "Shadmehr Aghili",
            album = "Golden Hits",
            duration = 254,
            url = "https://archive.org/download/ShadmehrAghili-BiToHargez_12/ShadmehrAghili-BiToHargez.mp3",
            mood = MoodType.FEELS_GOOD,
            coverUrl = "https://archive.org/services/img/ShadmehrAghili-BiToHargez_12",
            isNationalNet = true,
            collection = "National Net"
        ),
        Track(
            id = "iran-verified-2",
            title = "Kheyli Delam Azat Pore",
            artist = "Mohsen Yeganeh",
            album = "Rage Khab",
            duration = 242,
            url = "https://archive.org/download/MohsenYeganeh-KheyliDelamAzatPore/MohsenYeganeh-KheyliDelamAzatPore.mp3",
            mood = MoodType.CHILL,
            coverUrl = "https://archive.org/services/img/MohsenYeganeh-KheyliDelamAzatPore",
            isNationalNet = true,
            collection = "National Net"
        ),
        Track(
            id = "iran-verified-3",
            title = "Ghorshaye Khab Avar",
            artist = "Mohsen Yeganeh",
            album = "Hobab",
            duration = 218,
            url = "https://archive.org/download/MohsenYeganeh-GhorshayeKhabAvar/MohsenYeganeh-GhorshayeKhabAvar.mp3",
            mood = MoodType.FOCUS,
            coverUrl = "https://archive.org/services/img/MohsenYeganeh-GhorshayeKhabAvar",
            isNationalNet = true,
            collection = "National Net"
        ),
        Track(
            id = "iran-verified-4",
            title = "Pare Parvaz",
            artist = "Shadmehr Aghili",
            album = "Pare Parvaz",
            duration = 236,
            url = "https://archive.org/download/Shadmehr_Aghili_-_Pare_Parvaz/01_Pare_Parvaz.mp3",
            mood = MoodType.CHILL,
            coverUrl = "https://archive.org/services/img/Shadmehr_Aghili_-_Pare_Parvaz",
            isNationalNet = true,
            collection = "National Net"
        )
    )
}
