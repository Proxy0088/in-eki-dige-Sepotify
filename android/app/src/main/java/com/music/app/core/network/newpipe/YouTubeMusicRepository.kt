package com.music.app.core.network.newpipe

import android.util.Log
import com.music.app.core.model.MoodType
import com.music.app.core.model.Track
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import org.schabi.newpipe.extractor.ServiceList
import org.schabi.newpipe.extractor.services.youtube.linkHandler.YoutubeSearchQueryHandlerFactory
import org.schabi.newpipe.extractor.stream.StreamInfoItem
import java.util.concurrent.ConcurrentHashMap

object YouTubeMusicRepository {
    private const val TAG = "YouTubeMusicRepo"
    private const val CACHE_TTL_MS = 5 * 60 * 1000L // 5 minutes

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

        // High boost when both title and artist are matched by different tokens (e.g. "shadmehr eshghe")
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

    /**
     * Executes YouTube Music "Songs" search purely on device with NewPipeExtractor.
     * All calls run on Dispatchers.IO with coroutine cancellation support.
     */
    suspend fun searchSongs(query: String, limit: Int = 18): List<Track> = withContext(Dispatchers.IO) {
        val trimmed = query.trim()
        if (trimmed.isEmpty()) return@withContext emptyList()

        val normalizedQueryKey = normalizeText(trimmed)
        val cached = searchCache[normalizedQueryKey]
        if (cached != null && (System.currentTimeMillis() - cached.timestamp < CACHE_TTL_MS)) {
            return@withContext cached.results
        }

        try {
            ensureActive()
            val service = ServiceList.YouTube
            val searchQHFactory = service.searchQHFactory
            val queryHandler = searchQHFactory.fromQuery(
                trimmed,
                listOf(YoutubeSearchQueryHandlerFactory.MUSIC_SONGS),
                ""
            )

            ensureActive()
            val extractor = service.getSearchExtractor(queryHandler)
            extractor.fetchPage()

            ensureActive()
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

                // Pick highest resolution square or best available thumbnail
                val thumbnails = item.thumbnails ?: emptyList()
                val bestCover = thumbnails.maxByOrNull { (it.width * it.height) }?.url
                    ?: "https://i.ytimg.com/vi/$videoId/hqdefault.jpg"

                val track = Track(
                    id = "yt-$videoId",
                    title = rawName,
                    artist = cleanedArtist,
                    album = "", // Explicitly kept empty since StreamInfoItem does not have album metadata
                    duration = if (duration > 0) duration else 210,
                    url = "", // Stream URL resolved dynamically before playback via StreamResolver
                    coverUrl = bestCover,
                    mood = MoodType.CHILL,
                    isLiked = false,
                    isDownloaded = false,
                    isNationalNet = false,
                    collection = "YouTube Music"
                )

                candidates.add(TrackWithScore(track, score))
            }

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

            searchCache[normalizedQueryKey] = CachedResults(deduplicated)
            deduplicated
        } catch (ce: CancellationException) {
            throw ce
        } catch (e: Exception) {
            Log.e(TAG, "Search failed for query: $trimmed", e)
            emptyList()
        }
    }

    private data class TrackWithScore(val track: Track, val score: Int)
}
