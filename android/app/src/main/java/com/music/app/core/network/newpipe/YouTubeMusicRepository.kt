package com.music.app.core.network.newpipe

import android.util.Log
import com.music.app.core.model.MoodType
import com.music.app.core.model.Track
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import org.schabi.newpipe.extractor.ServiceList
import org.schabi.newpipe.extractor.services.youtube.linkHandler.YoutubeSearchQueryHandlerFactory
import org.schabi.newpipe.extractor.stream.StreamInfoItem
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

object YouTubeMusicRepository {
    private const val TAG = "YouTubeMusicRepo"
    private const val CACHE_TTL_MS = 5 * 60 * 1000L // 5 minutes

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(12, TimeUnit.SECONDS)
        .followRedirects(true)
        .build()

    private data class CachedResults(
        val results: List<Track>,
        val timestamp: Long = System.currentTimeMillis()
    )

    private val searchCache = ConcurrentHashMap<String, CachedResults>()

    private val PENALTY_KEYWORDS = listOf(
        "remix", "cover", "live", "sped up", "speed up", "slowed", "reverb",
        "karaoke", "instrumental", "acoustic", "کاور", "ریمیکس", "لایو", "بی کلام"
    )

    /**
     * Cleans artist name by stripping "- Topic" suffix and trimming.
     */
    fun cleanArtistName(rawArtist: String): String {
        return rawArtist
            .replace(Regex("(?i)\\s*-\\s*Topic$"), "")
            .trim()
    }

    /**
     * Splits raw artist string into individual artists (handling feat, ft, &, comma, etc.).
     */
    fun parseArtists(rawArtist: String): List<String> {
        val cleaned = cleanArtistName(rawArtist)
        return cleaned.split(Regex("(?i)\\s*(?:\\b(?:feat|ft|with)\\b\\.?|[&,/+])\\s*"))
            .map { it.trim() }
            .filter { it.isNotEmpty() }
    }

    /**
     * Normalizes text for Persian and English (handling Arabic/Persian character variants,
     * removing zero-width non-joiners, punctuation, and extra spaces).
     */
    fun normalizeText(input: String): String {
        var s = input.lowercase()
        s = s.replace('ي', 'ی')
        s = s.replace('ك', 'ک')
        s = s.replace('ة', 'ه')
        s = s.replace('ۀ', 'ه')
        s = s.replace('ؤ', 'و')
        s = s.replace('إ', 'ا')
        s = s.replace('أ', 'ا')
        s = s.replace('آ', 'ا')
        s = s.replace('ء', ' ')
        s = s.replace('\u200C', ' ') // نیم‌فاصله -> space
        s = s.replace(Regex("[\\u064B-\\u065F]"), "") // Arabic diacritics
        s = s.replace(Regex("[^a-zA-Z0-9\\u0600-\\u06FF\\s]"), " ")
        s = s.replace(Regex("\\s+"), " ").trim()
        return s
    }

    /**
     * Computes ranking score for a candidate track against user query.
     */
    fun scoreTrack(query: String, trackTitle: String, rawArtist: String, durationSec: Int): Int {
        val normQuery = normalizeText(query)
        val normTitle = normalizeText(trackTitle)
        val artists = parseArtists(rawArtist)
        val normArtists = artists.map { normalizeText(it) }
        val allArtistsCombined = normArtists.joinToString(" ")

        var score = 0

        // 1. Exact match bonus
        if (normTitle == normQuery) {
            score += 1000
        } else if (normTitle.contains(normQuery) || normQuery.contains(normTitle)) {
            score += 500
        }

        // 2. Query token matching across title and artist
        val queryTokens = normQuery.split(" ").filter { it.length >= 2 }
        var titleMatchedTokens = 0
        var artistMatchedTokens = 0

        for (token in queryTokens) {
            val inTitle = normTitle.contains(token)
            val inArtist = allArtistsCombined.contains(token)

            if (inTitle) {
                titleMatchedTokens++
                score += 150
            }
            if (inArtist) {
                artistMatchedTokens++
                score += 150
            }
        }

        // High boost when both title and artist are matched by different tokens
        if (titleMatchedTokens > 0 && artistMatchedTokens > 0) {
            score += 800
        }

        // 3. Penalty for non-original versions (unless user explicitly searched for them)
        for (penaltyWord in PENALTY_KEYWORDS) {
            val normPenalty = normalizeText(penaltyWord)
            val penaltyInTitle = normTitle.contains(normPenalty)
            val penaltyInQuery = normQuery.contains(normPenalty)

            if (penaltyInTitle && !penaltyInQuery) {
                score -= 500
            }
        }

        // 4. Duration sanity check
        if (durationSec in 75..420) {
            score += 60 // Normal single track duration
        } else if (durationSec < 50) {
            score -= 300 // Teaser, ringtone, or snippet
        } else if (durationSec > 600) {
            score -= 250 // Full album, DJ set, or long mix
        }

        return score
    }

    private fun parseDuration(text: String?): Int {
        if (text.isNullOrEmpty()) return 0
        val parts = text.split(":").mapNotNull { it.toIntOrNull() }
        if (parts.size == 2) return parts[0] * 60 + parts[1]
        if (parts.size == 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
        return 0
    }

    private data class ParsedSubtitle(
        val valid: Boolean,
        val isSong: Boolean,
        val isVideo: Boolean,
        val artist: String,
        val album: String,
        val durationSec: Int
    )

    private fun parseSubtitle(runs: JSONArray?): ParsedSubtitle {
        if (runs == null || runs.length() == 0) {
            return ParsedSubtitle(false, false, false, "", "", 0)
        }

        val groups = mutableListOf<MutableList<String>>()
        var currentGroup = mutableListOf<String>()

        for (i in 0 until runs.length()) {
            val r = runs.optJSONObject(i) ?: continue
            val text = r.optString("text", "").trim()
            if (text.isEmpty()) continue
            if (text == "•" || text == "·") {
                if (currentGroup.isNotEmpty()) {
                    groups.add(currentGroup)
                    currentGroup = mutableListOf()
                }
            } else {
                currentGroup.add(text)
            }
        }
        if (currentGroup.isNotEmpty()) {
            groups.add(currentGroup)
        }

        if (groups.isEmpty()) {
            return ParsedSubtitle(false, false, false, "", "", 0)
        }

        val typeStr = groups[0].joinToString("").lowercase()
        val isSong = typeStr.contains("song") || typeStr.contains("single") || typeStr.contains("آهنگ")
        val isVideo = typeStr.contains("video") || typeStr.contains("ویدیو")

        // Filter out non-music items like podcasts or profiles
        if (typeStr.contains("podcast") ||
            typeStr.contains("episode") ||
            typeStr.contains("profile") ||
            typeStr.contains("playlist")
        ) {
            return ParsedSubtitle(false, false, false, "", "", 0)
        }

        var artist = ""
        var album = ""
        var durationSec = 0

        if (groups.size > 1) {
            artist = groups[1].joinToString("").trim()
        }
        if (groups.size > 2) {
            for (i in 2 until groups.size) {
                val gText = groups[i].joinToString("").trim()
                if (gText.contains(":")) {
                    durationSec = parseDuration(gText)
                } else if (album.isEmpty() &&
                    !gText.contains("views") &&
                    !gText.contains("plays") &&
                    !gText.contains("subscribers") &&
                    !gText.contains("بازدید") &&
                    !gText.matches(Regex("^\\d{4}$"))
                ) {
                    album = gText
                }
            }
        }

        return ParsedSubtitle(true, isSong, isVideo, artist, album, durationSec)
    }

    private fun extractItemsFromShelf(
        shelfItems: JSONArray,
        trimmedQuery: String,
        seenVideoIds: MutableSet<String>,
        candidates: MutableList<TrackWithScore>
    ) {
        for (i in 0 until shelfItems.length()) {
            val item = shelfItems.optJSONObject(i) ?: continue
            val r = item.optJSONObject("musicResponsiveListItemRenderer") ?: continue
            val flexCols = r.optJSONArray("flexColumns") ?: continue
            if (flexCols.length() == 0) continue

            val titleCol = flexCols.optJSONObject(0)
                ?.optJSONObject("musicResponsiveListItemFlexColumnRenderer")
                ?.optJSONObject("text")
                ?.optJSONArray("runs") ?: continue

            val title = (0 until titleCol.length()).joinToString("") {
                titleCol.optJSONObject(it)?.optString("text", "") ?: ""
            }.trim()

            var videoId = r.optJSONObject("playlistItemData")?.optString("videoId")
            if (videoId.isNullOrEmpty()) {
                videoId = titleCol.optJSONObject(0)
                    ?.optJSONObject("navigationEndpoint")
                    ?.optJSONObject("watchEndpoint")
                    ?.optString("videoId")
            }
            if (videoId.isNullOrEmpty()) {
                videoId = r.optJSONObject("overlay")
                    ?.optJSONObject("musicItemThumbnailOverlayRenderer")
                    ?.optJSONObject("content")
                    ?.optJSONObject("musicPlayButtonRenderer")
                    ?.optJSONObject("playNavigationEndpoint")
                    ?.optJSONObject("watchEndpoint")
                    ?.optString("videoId")
            }

            val subCol = if (flexCols.length() > 1) {
                flexCols.optJSONObject(1)
                    ?.optJSONObject("musicResponsiveListItemFlexColumnRenderer")
                    ?.optJSONObject("text")
                    ?.optJSONArray("runs")
            } else null

            val sub = parseSubtitle(subCol)
            Log.i(TAG, "extractItems item: title='$title', vid=$videoId, subValid=${sub.valid}")

            if (videoId.isNullOrEmpty() || title.isEmpty() || seenVideoIds.contains(videoId)) {
                continue
            }

            if (!sub.valid) continue

            seenVideoIds.add(videoId)

            var duration = sub.durationSec
            if (duration == 0) {
                val fixedRuns = r.optJSONArray("fixedColumns")
                    ?.optJSONObject(0)
                    ?.optJSONObject("musicResponsiveListItemFixedColumnRenderer")
                    ?.optJSONObject("text")
                    ?.optJSONArray("runs")
                val fixedText = fixedRuns?.optJSONObject(0)?.optString("text")
                duration = parseDuration(fixedText)
            }

            val thumbs = r.optJSONObject("thumbnail")
                ?.optJSONObject("musicThumbnailRenderer")
                ?.optJSONObject("thumbnail")
                ?.optJSONArray("thumbnails")

            val coverUrl = thumbs?.optJSONObject(thumbs.length() - 1)?.optString("url")
                ?: "https://i.ytimg.com/vi/$videoId/hqdefault.jpg"

            val rawArtist = sub.artist.ifEmpty { "Artist" }
            val cleanedArtist = cleanArtistName(rawArtist)
            val finalDuration = if (duration > 0) duration else 210
            val score = scoreTrack(trimmedQuery, title, rawArtist, finalDuration)

            candidates.add(
                TrackWithScore(
                    Track(
                        id = "yt-$videoId",
                        title = title,
                        artist = cleanedArtist,
                        album = sub.album,
                        duration = finalDuration,
                        url = "",
                        coverUrl = coverUrl,
                        mood = MoodType.CHILL,
                        isLiked = false,
                        isDownloaded = false,
                        isNationalNet = false,
                        collection = "YouTube Music"
                    ),
                    score
                )
            )
        }
    }

    /**
     * Executes official YouTube Music WEB_REMIX InnerTube search directly from on-device OkHttp.
     * Exact same logic as reference-web/src/services/youtubeMusicProvider.ts.
     */
    private suspend fun searchInnerTube(query: String, limit: Int = 18): List<Track> = withContext(Dispatchers.IO) {
        val trimmed = query.trim()
        if (trimmed.isEmpty()) return@withContext emptyList()

        val postJson = JSONObject().apply {
            put(
                "context",
                JSONObject().apply {
                    put(
                        "client",
                        JSONObject().apply {
                            put("clientName", "WEB_REMIX")
                            put("clientVersion", "1.20240101.01.00")
                            put("hl", "en")
                            put("gl", "US")
                        }
                    )
                }
            )
            put("query", trimmed)
        }

        val request = Request.Builder()
            .url("https://music.youtube.com/youtubei/v1/search")
            .header("Content-Type", "application/json")
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .header("Referer", "https://music.youtube.com/")
            .header("Origin", "https://music.youtube.com")
            .post(postJson.toString().toRequestBody("application/json".toMediaType()))
            .build()

        val response = httpClient.newCall(request).execute()
        if (!response.isSuccessful) {
            Log.w(TAG, "InnerTube HTTP error: ${response.code}")
            return@withContext emptyList()
        }

        val bodyString = response.body?.string() ?: return@withContext emptyList()
        val data = JSONObject(bodyString)

        val candidates = mutableListOf<TrackWithScore>()
        val seenVideoIds = mutableSetOf<String>()

        val tabs = data.optJSONObject("contents")
            ?.optJSONObject("tabbedSearchResultsRenderer")
            ?.optJSONArray("tabs")
        Log.i(TAG, "InnerTube tabs count: ${tabs?.length()}")
        if (tabs == null || tabs.length() == 0) return@withContext emptyList()

        val sectionList = tabs.optJSONObject(0)
            ?.optJSONObject("tabRenderer")
            ?.optJSONObject("content")
            ?.optJSONObject("sectionListRenderer")
            ?.optJSONArray("contents")
        Log.i(TAG, "InnerTube sectionList count: ${sectionList?.length()}")
        if (sectionList == null) return@withContext emptyList()

        for (s in 0 until sectionList.length()) {
            ensureActive()
            val sec = sectionList.optJSONObject(s) ?: continue
            Log.i(TAG, "sec $s keys: ${sec.keys().asSequence().toList()}")

            // 1. MusicCardShelfRenderer (Top result card)
            sec.optJSONObject("musicCardShelfRenderer")?.let { card ->
                val cardTitleRuns = card.optJSONObject("title")?.optJSONArray("runs")
                val title = (0 until (cardTitleRuns?.length() ?: 0)).joinToString("") {
                    cardTitleRuns?.optJSONObject(it)?.optString("text", "") ?: ""
                }.trim()

                var videoId = card.optJSONObject("title")
                    ?.optJSONArray("runs")
                    ?.optJSONObject(0)
                    ?.optJSONObject("navigationEndpoint")
                    ?.optJSONObject("watchEndpoint")
                    ?.optString("videoId")

                if (videoId.isNullOrEmpty()) {
                    videoId = card.optJSONObject("onTap")
                        ?.optJSONObject("watchEndpoint")
                        ?.optString("videoId")
                }

                if (!videoId.isNullOrEmpty() && title.isNotEmpty() && !seenVideoIds.contains(videoId)) {
                    val subRuns = card.optJSONObject("subtitle")?.optJSONArray("runs")
                    val sub = parseSubtitle(subRuns)
                    if (sub.valid) {
                        seenVideoIds.add(videoId)
                        val thumbs = card.optJSONObject("thumbnail")
                            ?.optJSONObject("musicThumbnailRenderer")
                            ?.optJSONObject("thumbnail")
                            ?.optJSONArray("thumbnails")
                        val coverUrl = thumbs?.optJSONObject(thumbs.length() - 1)?.optString("url")
                            ?: "https://i.ytimg.com/vi/$videoId/hqdefault.jpg"

                        val rawArtist = sub.artist.ifEmpty { "Artist" }
                        val cleanedArtist = cleanArtistName(rawArtist)
                        val duration = if (sub.durationSec > 0) sub.durationSec else 210
                        val score = scoreTrack(trimmed, title, rawArtist, duration) + 300 // top result boost

                        candidates.add(
                            TrackWithScore(
                                Track(
                                    id = "yt-$videoId",
                                    title = title,
                                    artist = cleanedArtist,
                                    album = sub.album,
                                    duration = duration,
                                    url = "",
                                    coverUrl = coverUrl,
                                    mood = MoodType.CHILL,
                                    isLiked = false,
                                    isDownloaded = false,
                                    isNationalNet = false,
                                    collection = "YouTube Music"
                                ),
                                score
                            )
                        )
                    }
                }

                // Also parse any track items inside card contents
                val cardItems = card.optJSONArray("contents")
                if (cardItems != null) {
                    extractItemsFromShelf(cardItems, trimmed, seenVideoIds, candidates)
                }
            }

            // 2. MusicShelfRenderer or ItemSectionRenderer (List of tracks)
            val shelfItems = sec.optJSONObject("musicShelfRenderer")?.optJSONArray("contents")
                ?: sec.optJSONObject("itemSectionRenderer")?.optJSONArray("contents")

            if (shelfItems != null) {
                extractItemsFromShelf(shelfItems, trimmed, seenVideoIds, candidates)
            }
        }

        Log.i(TAG, "InnerTube parsed raw candidates: ${candidates.size}")
        // Sort by ranking score descending
        candidates.sortByDescending { it.score }

        // Deduplicate: same normalized title + artist
        val deduplicated = mutableListOf<Track>()
        val seenSignatures = mutableSetOf<String>()

        for (entry in candidates) {
            val signature = "${normalizeText(entry.track.title)}::${normalizeText(entry.track.artist)}"
            if (!seenSignatures.contains(signature)) {
                seenSignatures.add(signature)
                deduplicated.add(entry.track)
            }
            if (deduplicated.size >= limit) break
        }

        deduplicated
    }

    /**
     * Fallback on-device search via NewPipeExtractor
     */
    private suspend fun searchNewPipe(query: String, limit: Int): List<Track> = withContext(Dispatchers.IO) {
        val trimmed = query.trim()
        val service = ServiceList.YouTube
        val searchQHFactory = service.searchQHFactory
        val queryHandler = searchQHFactory.fromQuery(
            trimmed,
            listOf(YoutubeSearchQueryHandlerFactory.MUSIC_SONGS),
            ""
        )
        val extractor = service.getSearchExtractor(queryHandler)
        extractor.fetchPage()

        val initialPage = extractor.initialPage
        val rawItems = initialPage?.items ?: emptyList()

        val candidates = mutableListOf<TrackWithScore>()
        val seenVideoIds = mutableSetOf<String>()

        for (item in rawItems) {
            ensureActive()
            if (item !is StreamInfoItem) continue
            val url = item.url ?: continue
            val videoId = url.substringAfter("v=").substringBefore("&").trim()
            if (videoId.isEmpty() || seenVideoIds.contains(videoId)) continue
            seenVideoIds.add(videoId)

            val rawName = item.name ?: "Unknown Track"
            val rawUploader = item.uploaderName ?: "Artist"
            val duration = item.duration.toInt().coerceAtLeast(0)
            val cleanedArtist = cleanArtistName(rawUploader)
            val score = scoreTrack(trimmed, rawName, rawUploader, duration)

            val thumbnails = item.thumbnails ?: emptyList()
            val bestCover = thumbnails.maxByOrNull { (it.width * it.height) }?.url
                ?: "https://i.ytimg.com/vi/$videoId/hqdefault.jpg"

            candidates.add(
                TrackWithScore(
                    Track(
                        id = "yt-$videoId",
                        title = rawName,
                        artist = cleanedArtist,
                        album = "",
                        duration = if (duration > 0) duration else 210,
                        url = "",
                        coverUrl = bestCover,
                        mood = MoodType.CHILL,
                        isLiked = false,
                        isDownloaded = false,
                        isNationalNet = false,
                        collection = "YouTube Music"
                    ),
                    score
                )
            )
        }

        candidates.sortByDescending { it.score }
        val deduplicated = mutableListOf<Track>()
        val seenSignatures = mutableSetOf<String>()
        for (entry in candidates) {
            val signature = "${normalizeText(entry.track.title)}::${normalizeText(entry.track.artist)}"
            if (!seenSignatures.contains(signature)) {
                seenSignatures.add(signature)
                deduplicated.add(entry.track)
            }
            if (deduplicated.size >= limit) break
        }
        deduplicated
    }

    /**
     * Main YouTube search entry point.
     * Prioritizes official InnerTube WEB_REMIX (matching localhost reference-web),
     * with transparent NewPipeExtractor fallback.
     */
    suspend fun searchSongs(query: String, limit: Int = 18): List<Track> = withContext(Dispatchers.IO) {
        val trimmed = query.trim()
        if (trimmed.isEmpty()) return@withContext emptyList()
        Log.i(TAG, "searchSongs initiated for '$trimmed'")

        val normalizedQueryKey = normalizeText(trimmed)
        val cached = searchCache[normalizedQueryKey]
        if (cached != null && (System.currentTimeMillis() - cached.timestamp < CACHE_TTL_MS)) {
            Log.i(TAG, "searchSongs returning from cache: ${cached.results.size} tracks")
            return@withContext cached.results
        }

        try {
            ensureActive()
            // 1. First attempt: Direct InnerTube search (matching localhost reference-web)
            var results = try {
                searchInnerTube(trimmed, limit)
            } catch (e: Exception) {
                Log.w(TAG, "InnerTube search attempt failed, trying fallback: ${e.message}")
                emptyList()
            }

            // 2. Second attempt: Fallback to NewPipeExtractor if InnerTube was empty
            if (results.isEmpty()) {
                ensureActive()
                results = try {
                    searchNewPipe(trimmed, limit)
                } catch (e: Exception) {
                    Log.w(TAG, "NewPipe fallback failed: ${e.message}")
                    emptyList()
                }
            }

            Log.i(TAG, "searchSongs finished for '$trimmed', found ${results.size} tracks")
            if (results.isNotEmpty()) {
                searchCache[normalizedQueryKey] = CachedResults(results)
            }
            results
        } catch (ce: CancellationException) {
            throw ce
        } catch (e: Exception) {
            Log.e(TAG, "Search failed for query: $trimmed", e)
            emptyList()
        }
    }

    private data class TrackWithScore(val track: Track, val score: Int)
}
