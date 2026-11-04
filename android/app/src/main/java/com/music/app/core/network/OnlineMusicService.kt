package com.music.app.core.network

import com.music.app.core.model.MoodType
import com.music.app.core.model.Track
import com.music.app.core.network.newpipe.StreamResolver
import com.music.app.core.network.newpipe.YouTubeMusicRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
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
     * Main search function.
     * - In ONLINE mode: Pure on-device YouTube Music search via YouTubeMusicRepository (NewPipeExtractor).
     * - In NATIONAL_NET mode: Domestic MusicDel suggest API and verified Iranian songs catalog.
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

        // Online mode: Strictly use NewPipeExtractor on-device YouTube Music search
        YouTubeMusicRepository.searchSongs(trimmed)
    }

    /**
     * Search songs on musicdel.ir using the official suggest API (Dedicated to NATIONAL_NET mode).
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
     * Upgrades a track by resolving its direct audio stream URL on demand.
     * - YouTube songs: Extracted directly on device using StreamResolver (NewPipeExtractor).
     * - MusicDel songs: Scraped direct 320kbps mp3.
     */
    suspend fun resolveTrackAudio(track: Track, forceRefresh: Boolean = false): Track = withContext(Dispatchers.IO) {
        // Direct local or resolved static URLs
        if (track.url.endsWith(".mp3", ignoreCase = true) ||
            track.url.contains(".mp3?", ignoreCase = true) ||
            track.url.startsWith("content://") ||
            track.url.startsWith("file://")
        ) {
            return@withContext track
        }

        // MusicDel MP3 post resolution (National Net mode)
        if (track.isNationalNet || track.url.startsWith("https://musicdel.ir") || track.url.contains("single-tracks")) {
            val directMp3 = resolveMusicDelMp3(track.url)
            if (directMp3 != null) {
                return@withContext track.copy(url = directMp3)
            }
            return@withContext track
        }

        // YouTube video stream resolution via pure on-device NewPipeExtractor
        val videoId = if (track.id.startsWith("yt-")) {
            track.id.removePrefix("yt-")
        } else if (track.url.contains("v=")) {
            track.url.substringAfter("v=").substringBefore("&")
        } else {
            track.id
        }

        val streamUrl = StreamResolver.resolveStreamUrl(videoId, forceRefresh)
        if (!streamUrl.isNullOrEmpty()) {
            return@withContext track.copy(url = streamUrl)
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
