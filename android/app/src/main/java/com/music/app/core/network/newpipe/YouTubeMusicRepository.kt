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
     * Cleans artist name by stripping "- Topic", "Official", etc., and trimming.
     */
    fun cleanArtistName(rawArtist: String): String {
        return rawArtist
            .replace(Regex("(?i)\\s*-\\s*Topic$"), "")
            .replace(Regex("(?i)\\s+Official(?:\\s+Channel)?$"), "")
            .replace(Regex("(?i)^Official\\s+"), "")
            .trim()
    }

    /**
     * Cleans display title by stripping trailing noise like (Official Video), [Audio], [Subtitle], etc.
     */
    fun cleanDisplayTitle(rawTitle: String): String {
        return rawTitle
            .replace(Regex("(?i)\\s*[\\[\\(]?(?:official\\s+(?:video|audio|music\\s+video)|video\\s+clip|audio|lyric\\s+video|lyrics|موزیک\\s+ویدیو|ویدیو\\s+کلیپ|کلیپ|آهنگ)[\\]\\)]?"), "")
            .replace(Regex("(?i)\\s*[\\[\\(]?(?:remastered(?:\\s+\\d{4})?|4k|hd|hq)[\\]\\)]?"), "")
            .replace(Regex("(?i)\\s*[\\[\\(]?(?:[a-zA-Z]+\\s+)?(?:subtitle|subtitles|lyric|lyrics|with\\s+lyrics)[\\]\\)]?"), "")
            .replace(Regex("(?i)\\s*[\\[\\(]?(?:زیرنویس(?:\\s+فارسی)?|همراه\\s+با\\s+متن)[\\]\\)]?"), "")
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
     * Computes ranking score for a candidate track against user query with strict original/main version ranking.
     */
    fun scoreTrack(
        query: String,
        trackTitle: String,
        rawArtist: String,
        durationSec: Int,
        isTopicChannel: Boolean = false,
        viewCount: Long = 0L
    ): Int {
        val normQuery = normalizeText(query)
        val normTitle = normalizeText(trackTitle)
        val normArtist = normalizeText(cleanArtistName(rawArtist))

        var score = 0

        // 1. Exact match bonus
        if (normTitle == normQuery) {
            score += 350
        } else if (normTitle.contains(normQuery) || normQuery.contains(normTitle)) {
            score += 250
        }

        // 2. Query token matching across title and artist
        val queryTokens = normQuery.split(" ").filter { it.length >= 2 }
        var titleMatchedTokens = 0
        var artistMatchedTokens = 0
        var totalMatchedTokens = 0

        for (token in queryTokens) {
            val inTitle = normTitle.contains(token)
            val inArtist = normArtist.contains(token)

            if (inTitle) titleMatchedTokens++
            if (inArtist) artistMatchedTokens++
            if (inTitle || inArtist) totalMatchedTokens++
        }

        score += totalMatchedTokens * 150

        // Ratio of matched tokens: if all query tokens are present, give huge boost
        if (queryTokens.isNotEmpty() && totalMatchedTokens == queryTokens.size) {
            score += 550 // All query terms matched!
        } else if (queryTokens.isNotEmpty()) {
            val missing = queryTokens.size - totalMatchedTokens
            score -= missing * 120 // Penalty for missing query terms
        }

        // High boost when both title and artist are matched by query tokens
        if (titleMatchedTokens > 0 && artistMatchedTokens > 0) {
            score += 300
        }

        // Exact phrase in title bonus
        if (normTitle.contains(normQuery)) {
            score += 300
        }

        // 3. Official Artist / Topic channel boost (+400)
        if (isTopicChannel || rawArtist.contains("- Topic", ignoreCase = true) || rawArtist.contains("Official", ignoreCase = true)) {
            score += 400
        }

        // 4. Penalties for non-original / derivative versions
        // Karaoke / instrumental / بی کلام -> -500
        if (normTitle.contains("karaoke") || normTitle.contains("instrumental") || normTitle.contains("بی کلام")) {
            score -= 500
        }
        // Cover / کاور / اجرای زنده -> -400
        if (normTitle.contains("cover") || normTitle.contains("کاور") || normTitle.contains("اجرای زنده")) {
            score -= 400
        }
        // Sped up / slowed / reverb / 8d / bass boosted -> -400
        if (normTitle.contains("sped up") || normTitle.contains("speed up") || normTitle.contains("slowed") ||
            normTitle.contains("reverb") || normTitle.contains("8d") || normTitle.contains("bass boosted")
        ) {
            score -= 400
        }
        // Live / لایو / live in / کنسرت / concert -> -300
        if (normTitle.contains("live") || normTitle.contains("لایو") || normTitle.contains("کنسرت") || normTitle.contains("concert")) {
            score -= 300
        }
        // Remix / ریمیکس -> -300 (unless user explicitly searched for remix)
        if ((normTitle.contains("remix") || normTitle.contains("ریمیکس")) && !normQuery.contains("remix") && !normQuery.contains("ریمیکس")) {
            score -= 300
        }
        // Official video / music video / موزیک ویدیو / ویدیو کلیپ -> -100 (prefer pure audio/topic tracks)
        if (normTitle.contains("official video") || normTitle.contains("music video") ||
            normTitle.contains("موزیک ویدیو") || normTitle.contains("ویدیو کلیپ")
        ) {
            score -= 100
        }

        // 5. Duration window: 90s .. 360s -> +150 (filters out 10-second teasers & 1-hour loops)
        if (durationSec in 90..360) {
            score += 150
        } else if (durationSec in 1..89) {
            score -= 350 // Teaser or short snippet
        } else if (durationSec > 600) {
            score -= 300 // Full album or DJ set
        }

        // 6. View count boost as proxy for popularity / canonical release
        if (viewCount > 0) {
            val viewBonus = (Math.log10(viewCount.toDouble()) * 25).toInt().coerceIn(0, 250)
            score += viewBonus
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

            var rawArtist = sub.artist
            if (rawArtist.isEmpty() && subCol != null && subCol.length() > 0) {
                rawArtist = (0 until subCol.length()).joinToString("") {
                    subCol.optJSONObject(it)?.optString("text", "") ?: ""
                }.trim()
            }
            if (rawArtist.isEmpty()) rawArtist = "Artist"

            val cleanedArtist = cleanArtistName(rawArtist)
            val displayTitle = cleanDisplayTitle(title)
            val isTopic = rawArtist.contains("- Topic", ignoreCase = true)
            val score = scoreTrack(trimmedQuery, title, rawArtist, duration, isTopicChannel = isTopic)

            candidates.add(
                TrackWithScore(
                    Track(
                        id = "yt-$videoId",
                        title = displayTitle.ifEmpty { title },
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
     * Fallback on-device search via NewPipeExtractor (General search, no restrictive filters)
     */
    private suspend fun searchNewPipe(query: String, limit: Int): List<Track> = withContext(Dispatchers.IO) {
        val trimmed = query.trim()
        val service = ServiceList.YouTube
        val searchQHFactory = service.searchQHFactory
        // Empty list = search all videos so Persian and International songs are never filtered out
        val queryHandler = searchQHFactory.fromQuery(
            trimmed,
            emptyList(),
            ""
        )
        val extractor = service.getSearchExtractor(queryHandler)
        extractor.fetchPage()

        val initialPage = extractor.initialPage
        val rawItems = initialPage?.items ?: emptyList()
        Log.i(TAG, "NewPipe (no-filter) returned ${rawItems.size} raw items for '$trimmed'")

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
            val viewCount = item.viewCount.coerceAtLeast(0)
            val isTopic = rawUploader.contains("- Topic", ignoreCase = true) || rawUploader.contains("Official", ignoreCase = true)

            // Extract artist and title if the video title is structured as "Artist - Title"
            var parsedArtist = rawUploader
            var parsedTitle = rawName

            if (isTopic) {
                parsedArtist = cleanArtistName(rawUploader)
            } else if (rawName.contains(" - ")) {
                val parts = rawName.split(" - ", limit = 2)
                parsedArtist = cleanArtistName(parts[0])
                parsedTitle = parts[1]
            } else if (rawName.contains(" – ")) {
                val parts = rawName.split(" – ", limit = 2)
                parsedArtist = cleanArtistName(parts[0])
                parsedTitle = parts[1]
            }

            val cleanedArtist = cleanArtistName(parsedArtist)
            val displayTitle = cleanDisplayTitle(parsedTitle)
            val score = scoreTrack(
                query = trimmed,
                trackTitle = rawName,
                rawArtist = rawUploader,
                durationSec = duration,
                isTopicChannel = isTopic,
                viewCount = viewCount
            )

            val thumbnails = item.thumbnails ?: emptyList()
            val bestCover = thumbnails.maxByOrNull { (it.width * it.height) }?.url
                ?: "https://i.ytimg.com/vi/$videoId/hqdefault.jpg"

            candidates.add(
                TrackWithScore(
                    Track(
                        id = "yt-$videoId",
                        title = displayTitle.ifEmpty { rawName },
                        artist = cleanedArtist.ifEmpty { "Artist" },
                        album = "",
                        duration = duration,
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
     * Prioritizes robust NewPipeExtractor (no restrictive filters),
     * with transparent InnerTube WEB_REMIX fallback.
     */
    suspend fun searchSongs(query: String, limit: Int = 18): List<Track> = withContext(Dispatchers.IO) {
        val trimmed = query.trim()
        if (trimmed.isEmpty()) return@withContext emptyList()
        Log.e(TAG, "searchSongs initiated for '$trimmed'")

        val normalizedQueryKey = normalizeText(trimmed)
        val cached = searchCache[normalizedQueryKey]
        if (cached != null && (System.currentTimeMillis() - cached.timestamp < CACHE_TTL_MS)) {
            Log.e(TAG, "searchSongs returning from cache: ${cached.results.size} tracks")
            return@withContext cached.results
        }

        try {
            ensureActive()
            // 1. Primary path: Robust NewPipe search without restrictive filters
            var results = try {
                val np = searchNewPipe(trimmed, limit)
                Log.e(TAG, "searchNewPipe returned ${np.size} tracks")
                np
            } catch (e: Exception) {
                Log.e(TAG, "NewPipe search attempt failed, trying InnerTube fallback: ${e.message}", e)
                emptyList()
            }

            // 2. Secondary path: Fallback to InnerTube if NewPipe returned empty
            if (results.isEmpty()) {
                ensureActive()
                results = try {
                    val it = searchInnerTube(trimmed, limit)
                    Log.e(TAG, "searchInnerTube returned ${it.size} tracks")
                    it
                } catch (e: Exception) {
                    Log.e(TAG, "InnerTube fallback failed: ${e.message}", e)
                    emptyList()
                }
            }

            Log.e(TAG, "searchSongs finished for '$trimmed', found ${results.size} tracks")
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
