package com.music.app.core.network

import com.music.app.core.model.MoodType
import com.music.app.core.model.Track
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.net.URLEncoder
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import java.util.regex.Pattern

object OnlineMusicService {

    private val client = OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .followRedirects(true)
        .build()

    private val postMp3Cache = ConcurrentHashMap<String, String>()

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
     * Main search function integrating MusicDel (Persian) and iTunes (International).
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

        // International mode: query both concurrently
        coroutineScope {
            val musicDelDeferred = async { searchMusicDel(trimmed) }
            val itunesDeferred = async { searchItunes(trimmed) }

            val musicDelResults = try { musicDelDeferred.await() } catch (e: Exception) { emptyList() }
            val itunesResults = try { itunesDeferred.await() } catch (e: Exception) { emptyList() }

            val combined = mutableListOf<Track>()
            val isPersian = isPersianText(trimmed)

            if (isPersian) {
                combined.addAll(musicDelResults)
                combined.addAll(itunesResults)
            } else {
                combined.addAll(itunesResults)
                combined.addAll(musicDelResults)
            }

            combined
        }
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

                // Skip artist categories; only single track posts
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

                // Extract post ID
                val idMatch = Regex("single-tracks/(\\d+)").find(postUrl)
                val id = idMatch?.groupValues?.get(1) ?: "musicdel-$i"

                tracks.add(
                    Track(
                        id = "musicdel-$id",
                        title = cleanTitle.ifEmpty { "آهنگ جدید" },
                        artist = artist.ifEmpty { "موزیکدل" },
                        album = "MusicDel",
                        duration = 210,
                        url = postUrl, // Will be resolved to direct MP3
                        coverUrl = cleanCover,
                        isLiked = false,
                        isDownloaded = false,
                        isNationalNet = true,
                        collection = "موزیکدل"
                    )
                )
            }

            // Pre-resolve direct 320kbps MP3s for top 3 candidates concurrently
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

            // Find all MP3 links
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

            // Prefer 320kbps over 128kbps or 64kbps
            val bestMp3 = mp3List.find { it.contains("320") } ?: mp3List.first()
            postMp3Cache[postUrl] = bestMp3
            bestMp3
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    /**
     * Search official international songs and albums via Apple iTunes API.
     */
    suspend fun searchItunes(query: String, limit: Int = 15): List<Track> = withContext(Dispatchers.IO) {
        val trimmed = query.trim()
        if (trimmed.isEmpty()) return@withContext emptyList()

        try {
            val encodedQuery = URLEncoder.encode(trimmed, "UTF-8")
            val url = "https://itunes.apple.com/search?term=$encodedQuery&entity=song&limit=$limit"

            val request = Request.Builder()
                .url(url)
                .header("User-Agent", USER_AGENT)
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) return@withContext emptyList()

            val body = response.body?.string() ?: return@withContext emptyList()
            val jsonObject = JSONObject(body)
            val results = jsonObject.optJSONArray("results") ?: return@withContext emptyList()
            val tracks = mutableListOf<Track>()

            for (i in 0 until results.length()) {
                val item = results.optJSONObject(i) ?: continue
                val trackId = item.optLong("trackId", 0L)
                val trackName = item.optString("trackName", "")
                val artistName = item.optString("artistName", "")
                val collectionName = item.optString("collectionName", "Single")
                val artworkUrl100 = item.optString("artworkUrl100", "")
                val previewUrl = item.optString("previewUrl", "")
                val durationMillis = item.optLong("trackTimeMillis", 180000L)
                val primaryGenreName = item.optString("primaryGenreName", "").lowercase()

                if (previewUrl.isEmpty() || trackName.isEmpty()) continue

                // High-resolution artwork: replace 100x100 with 600x600
                val coverUrl = if (artworkUrl100.isNotEmpty()) {
                    artworkUrl100.replace("100x100bb.jpg", "600x600bb.jpg")
                } else null

                val mood = when {
                    primaryGenreName.contains("rock") || primaryGenreName.contains("electronic") ||
                    primaryGenreName.contains("hip-hop") || primaryGenreName.contains("rap") -> MoodType.GAMING
                    primaryGenreName.contains("classical") || primaryGenreName.contains("ambient") -> MoodType.FOCUS
                    primaryGenreName.contains("acoustic") || primaryGenreName.contains("jazz") -> MoodType.CHILL
                    else -> MoodType.FEELS_GOOD
                }

                tracks.add(
                    Track(
                        id = "itunes-$trackId",
                        title = trackName,
                        artist = artistName,
                        album = collectionName,
                        duration = (durationMillis / 1000).toInt(),
                        url = previewUrl, // Direct high-quality preview stream
                        coverUrl = coverUrl,
                        mood = mood,
                        isLiked = false,
                        isDownloaded = false,
                        isNationalNet = false,
                        collection = "iTunes Music"
                    )
                )
            }

            tracks
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    /**
     * Upgrades a track if needed by resolving its post URL into a direct playable MP3.
     */
    suspend fun resolveTrackAudio(track: Track): Track = withContext(Dispatchers.IO) {
        if (track.url.endsWith(".mp3", ignoreCase = true) ||
            track.url.contains(".mp3?", ignoreCase = true) ||
            track.url.contains("audio-ssl.itunes.apple.com") ||
            track.url.startsWith("content://") ||
            track.url.startsWith("file://")
        ) {
            return@withContext track
        }

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
            title = "بی تو هرگز",
            artist = "شادمهر عقیلی",
            album = "آهنگ‌های ماندگار",
            duration = 254,
            url = "https://archive.org/download/ShadmehrAghili-BiToHargez_12/ShadmehrAghili-BiToHargez.mp3",
            mood = MoodType.FEELS_GOOD,
            coverUrl = "https://archive.org/services/img/ShadmehrAghili-BiToHargez_12",
            isNationalNet = true,
            collection = "نت ملی"
        ),
        Track(
            id = "iran-verified-2",
            title = "خیلی دلم ازت پره",
            artist = "محسن یگانه",
            album = "رگ خواب",
            duration = 242,
            url = "https://archive.org/download/MohsenYeganeh-KheyliDelamAzatPore/MohsenYeganeh-KheyliDelamAzatPore.mp3",
            mood = MoodType.CHILL,
            coverUrl = "https://archive.org/services/img/MohsenYeganeh-KheyliDelamAzatPore",
            isNationalNet = true,
            collection = "نت ملی"
        ),
        Track(
            id = "iran-verified-3",
            title = "قرص‌های خواب‌آور",
            artist = "محسن یگانه",
            album = "حباب",
            duration = 218,
            url = "https://archive.org/download/MohsenYeganeh-GhorshayeKhabAvar/MohsenYeganeh-GhorshayeKhabAvar.mp3",
            mood = MoodType.FOCUS,
            coverUrl = "https://archive.org/services/img/MohsenYeganeh-GhorshayeKhabAvar",
            isNationalNet = true,
            collection = "نت ملی"
        ),
        Track(
            id = "iran-verified-4",
            title = "پر پرواز",
            artist = "شادمهر عقیلی",
            album = "پر پرواز",
            duration = 236,
            url = "https://archive.org/download/Shadmehr_Aghili_-_Pare_Parvaz/01_Pare_Parvaz.mp3",
            mood = MoodType.CHILL,
            coverUrl = "https://archive.org/services/img/Shadmehr_Aghili_-_Pare_Parvaz",
            isNationalNet = true,
            collection = "نت ملی"
        )
    )
}
