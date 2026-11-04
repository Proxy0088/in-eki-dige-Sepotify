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
        "http://192.168.1.57:3000",
        "http://127.0.0.1:3000",
        "http://10.0.2.2:3000"
    )

    private val fastProbeClient = OkHttpClient.Builder()
        .connectTimeout(1200, TimeUnit.MILLISECONDS)
        .readTimeout(1500, TimeUnit.MILLISECONDS)
        .build()

    @Volatile
    private var detectedBackendHost: String? = null

    private const val USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

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
     * Probes candidate backend hosts concurrently to detect active Vite proxy.
     */
    suspend fun probeBackendHost(): String? = withContext(Dispatchers.IO) {
        val current = detectedBackendHost
        if (current != null) return@withContext current

        try {
            coroutineScope {
                val deferreds = CANDIDATE_HOSTS.map { host ->
                    async {
                        try {
                            val req = Request.Builder()
                                .url("$host/api/health")
                                .build()
                            val res = fastProbeClient.newCall(req).execute()
                            if (res.isSuccessful) host else null
                        } catch (_: Exception) {
                            null
                        }
                    }
                }
                val found = deferreds.firstNotNullOfOrNull { it.await() }
                if (found != null) {
                    detectedBackendHost = found
                }
                found
            }
        } catch (_: Exception) {
            null
        }
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
     * Search genuine full-length YouTube Music songs matching reference-web YouTubeMusicProvider.
     */
    suspend fun searchYouTube(query: String, limit: Int = 14): List<Track> = withContext(Dispatchers.IO) {
        val trimmed = query.trim()
        if (trimmed.isEmpty()) return@withContext emptyList()

        try {
            val backend = probeBackendHost()
            val url = if (backend != null) {
                "$backend/api/ytmusic/youtubei/v1/search"
            } else {
                "https://music.youtube.com/youtubei/v1/search"
            }

            val jsonPayload = JSONObject().apply {
                put("context", JSONObject().apply {
                    put("client", JSONObject().apply {
                        put("clientName", "WEB_REMIX")
                        put("clientVersion", "1.20240101.01.00")
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
                .header("Referer", "https://music.youtube.com/")
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) return@withContext emptyList()

            val body = response.body?.string() ?: return@withContext emptyList()
            val root = JSONObject(body)
            val tracks = mutableListOf<Track>()
            val seenVideoIds = mutableSetOf<String>()

            val tabs = root.optJSONObject("contents")
                ?.optJSONObject("tabbedSearchResultsRenderer")
                ?.optJSONArray("tabs")
            val sectionList = tabs?.optJSONObject(0)
                ?.optJSONObject("tabRenderer")
                ?.optJSONObject("content")
                ?.optJSONObject("sectionListRenderer")
                ?.optJSONArray("contents")

            val streamBase = backend ?: "http://192.168.1.57:3000"

            if (sectionList != null) {
                for (i in 0 until sectionList.length()) {
                    val sec = sectionList.optJSONObject(i) ?: continue

                    // 1. Check musicCardShelfRenderer (Official Hero Track / Artist Card)
                    val card = sec.optJSONObject("musicCardShelfRenderer")
                    if (card != null) {
                        val cardVideoId = card.optJSONObject("onTap")?.optJSONObject("watchEndpoint")?.optString("videoId", "")
                            ?: card.optJSONObject("title")?.optJSONArray("runs")?.optJSONObject(0)
                                ?.optJSONObject("navigationEndpoint")?.optJSONObject("watchEndpoint")?.optString("videoId", "")
                            ?: ""

                        val titleRuns = card.optJSONObject("title")?.optJSONArray("runs")
                        val cardTitle = titleRuns?.let { runs ->
                            (0 until runs.length()).joinToString("") { runs.getJSONObject(it).optString("text", "") }
                        }?.trim() ?: ""

                        if (cardVideoId.isNotEmpty() && cardTitle.isNotEmpty() && !seenVideoIds.contains(cardVideoId)) {
                            seenVideoIds.add(cardVideoId)
                            val subRuns = card.optJSONObject("subtitle")?.optJSONArray("runs")
                            val cardArtist = subRuns?.optJSONObject(0)?.optString("text", "") ?: "Artist"
                            val thumbs = card.optJSONObject("thumbnail")?.optJSONObject("musicThumbnailRenderer")
                                ?.optJSONObject("thumbnail")?.optJSONArray("thumbnails")
                            val cover = thumbs?.optJSONObject(thumbs.length() - 1)?.optString("url", "")
                                ?: "https://i.ytimg.com/vi/$cardVideoId/hqdefault.jpg"

                            tracks.add(
                                Track(
                                    id = "yt-$cardVideoId",
                                    title = cardTitle,
                                    artist = cardArtist,
                                    album = "YouTube Music Original",
                                    duration = 210,
                                    url = "$streamBase/api/stream?v=$cardVideoId",
                                    coverUrl = cover,
                                    isLiked = false,
                                    isDownloaded = false,
                                    isNationalNet = false,
                                    collection = "YouTube Music"
                                )
                            )
                        }
                    }

                    // 2. Check musicShelfRenderer contents (Song search results)
                    val shelfContents = sec.optJSONObject("musicShelfRenderer")?.optJSONArray("contents")
                        ?: sec.optJSONObject("itemSectionRenderer")?.optJSONArray("contents")

                    if (shelfContents != null) {
                        for (j in 0 until shelfContents.length()) {
                            val r = shelfContents.optJSONObject(j)?.optJSONObject("musicResponsiveListItemRenderer") ?: continue

                            val flexCols = r.optJSONArray("flexColumns") ?: continue
                            val titleCol = flexCols.optJSONObject(0)
                                ?.optJSONObject("musicResponsiveListItemFlexColumnRenderer")
                                ?.optJSONObject("text")?.optJSONArray("runs")
                            val subCols = flexCols.optJSONObject(1)
                                ?.optJSONObject("musicResponsiveListItemFlexColumnRenderer")
                                ?.optJSONObject("text")?.optJSONArray("runs")

                            val title = titleCol?.let { runs ->
                                (0 until runs.length()).joinToString("") { runs.getJSONObject(it).optString("text", "") }
                            }?.trim() ?: ""

                            val videoId = r.optJSONObject("playlistItemData")?.optString("videoId", "")
                                ?.ifEmpty { null }
                                ?: titleCol?.optJSONObject(0)?.optJSONObject("navigationEndpoint")
                                    ?.optJSONObject("watchEndpoint")?.optString("videoId", "")
                                ?: r.optJSONObject("overlay")?.optJSONObject("musicItemThumbnailOverlayRenderer")
                                    ?.optJSONObject("content")?.optJSONObject("musicPlayButtonRenderer")
                                    ?.optJSONObject("playNavigationEndpoint")?.optJSONObject("watchEndpoint")
                                    ?.optString("videoId", "")
                                ?: ""

                            if (videoId.isEmpty() || title.isEmpty() || seenVideoIds.contains(videoId)) continue
                            seenVideoIds.add(videoId)

                            var artist = "Artist"
                            var durationSec = 210
                            if (subCols != null) {
                                for (k in 0 until subCols.length()) {
                                    val txt = subCols.getJSONObject(k).optString("text", "").trim()
                                    if (txt == "•" || txt.isEmpty()) continue
                                    if (txt.contains(":")) {
                                        durationSec = parseDurationText(txt)
                                    } else if (artist == "Artist" && !txt.contains("views") && !txt.contains("plays")) {
                                        artist = txt
                                    }
                                }
                            }

                            val thumbs = r.optJSONObject("thumbnail")?.optJSONObject("musicThumbnailRenderer")
                                ?.optJSONObject("thumbnail")?.optJSONArray("thumbnails")
                            val cover = thumbs?.optJSONObject(thumbs.length() - 1)?.optString("url", "")
                                ?: "https://i.ytimg.com/vi/$videoId/hqdefault.jpg"

                            tracks.add(
                                Track(
                                    id = "yt-$videoId",
                                    title = title,
                                    artist = artist,
                                    album = "YouTube Music",
                                    duration = durationSec,
                                    url = "$streamBase/api/stream?v=$videoId",
                                    coverUrl = cover,
                                    isLiked = false,
                                    isDownloaded = false,
                                    isNationalNet = false,
                                    collection = "YouTube Music"
                                )
                            )

                            if (tracks.size >= limit) break
                        }
                    }
                    if (tracks.size >= limit) break
                }
            }

            tracks
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    /**
     * Resolves YouTube video stream to direct audio stream URL through the stream proxy.
     */
    suspend fun resolveYouTubeStream(videoId: String): String = withContext(Dispatchers.IO) {
        val cached = youtubeStreamCache[videoId]
        if (cached != null) return@withContext cached

        val backend = probeBackendHost() ?: "http://192.168.1.57:3000"
        val proxyStream = "$backend/api/stream?v=$videoId"
        youtubeStreamCache[videoId] = proxyStream
        proxyStream
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
            track.url.contains("/api/stream?v=") ||
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
            return@withContext track.copy(url = ytStream)
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
