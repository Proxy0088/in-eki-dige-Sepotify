package com.music.app.core.network

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.net.URLEncoder
import java.util.concurrent.TimeUnit
import java.util.regex.Pattern
import kotlin.math.abs

data class LyricLine(
    val timeSec: Float,
    val timeMs: Long,
    val text: String
)

data class TrackLyrics(
    val isSynced: Boolean,
    val lines: List<LyricLine>,
    val plainLyrics: String? = null
)

object LyricsService {
    private const val TAG = "LyricsService"

    private val client = OkHttpClient.Builder()
        .connectTimeout(6, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .build()

    private val SYNCED_REGEX = Pattern.compile("\\[(\\d{2}):(\\d{2}(?:\\.\\d+)?)\\](.*)")

    /**
     * Cleans artist names and handles common synonyms/spellings (e.g., weekend -> The Weeknd).
     */
    fun normalizeArtist(rawArtist: String): String {
        var a = rawArtist
            .replace(Regex("\\(.*?\\)"), "")
            .replace(Regex("(?i)\\s*-\\s*Topic"), "")
            .replace(Regex("(?i)\\s*Official.*"), "")
            .trim()

        if (a.equals("weekend", ignoreCase = true) || a.equals("the weekend", ignoreCase = true)) {
            a = "The Weeknd"
        }
        return a
    }

    /**
     * Cleans track title by stripping video labels, remix suffixes, and noise.
     */
    fun normalizeTitle(rawTitle: String): String {
        return rawTitle
            .replace(Regex("\\(.*?\\)"), "")
            .replace(Regex("\\[.*?\\]"), "")
            .replace(Regex("(?i)official\\s*(music\\s*)?video"), "")
            .replace(Regex("(?i)music\\s*video"), "")
            .replace(Regex("(?i)video\\s*clip"), "")
            .replace(Regex("(?i)lyric\\s*video"), "")
            .replace(Regex("(?i)lyrics?"), "")
            .replace(Regex("(?i)audio"), "")
            .replace(Regex("(?i)موزیک\\s*ویدیو"), "")
            .replace(Regex("(?i)ویدیو\\s*کلیپ"), "")
            .trim()
    }

    private fun parseSyncedLines(syncedLyrics: String): List<LyricLine> {
        val lines = mutableListOf<LyricLine>()
        val rawLines = syncedLyrics.split("\n")
        for (raw in rawLines) {
            val matcher = SYNCED_REGEX.matcher(raw)
            if (matcher.find()) {
                val mins = matcher.group(1)?.toFloatOrNull() ?: 0f
                val secs = matcher.group(2)?.toFloatOrNull() ?: 0f
                val text = matcher.group(3)?.trim() ?: ""
                val timeSec = mins * 60f + secs
                val timeMs = (timeSec * 1000f).toLong()
                if (text.isNotEmpty()) {
                    lines.add(LyricLine(timeSec, timeMs, text))
                }
            }
        }
        return lines
    }

    private fun fetchJson(url: String): String? {
        val request = Request.Builder()
            .url(url)
            .header("User-Agent", "Sepotify/1.0 (Android)")
            .build()

        return try {
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) response.body?.string() else null
            }
        } catch (e: Exception) {
            Log.w(TAG, "Request failed for $url: ${e.message}")
            null
        }
    }

    suspend fun getLyrics(artist: String, title: String, durationSec: Int = 0): TrackLyrics? = withContext(Dispatchers.IO) {
        try {
            val cleanArtist = normalizeArtist(artist)
            val cleanTitle = normalizeTitle(title)

            Log.i(TAG, "Searching lyrics for artist='$cleanArtist', title='$cleanTitle', durationSec=$durationSec")

            val encArtist = URLEncoder.encode(cleanArtist, "UTF-8")
            val encTitle = URLEncoder.encode(cleanTitle, "UTF-8")

            // ── Tier 1: Exact direct lookup with duration ──
            if (durationSec > 0) {
                val directUrl = "https://lrclib.net/api/get?artist_name=$encArtist&track_name=$encTitle&duration=$durationSec"
                val bodyStr = fetchJson(directUrl)
                if (bodyStr != null) {
                    val candidate = parseCandidate(JSONObject(bodyStr), durationSec)
                    if (candidate != null && candidate.isSynced) {
                        Log.i(TAG, "Found exact synced lyrics via Tier 1 direct get")
                        return@withContext candidate
                    }
                }
            }

            // ── Tier 2: Search endpoint with track_name and artist_name ──
            val searchUrl1 = "https://lrclib.net/api/search?track_name=$encTitle&artist_name=$encArtist"
            val searchBody1 = fetchJson(searchUrl1)
            if (searchBody1 != null) {
                val best = pickBestFromSearchResults(searchBody1, cleanArtist, cleanTitle, durationSec)
                if (best != null) {
                    Log.i(TAG, "Found best lyrics via Tier 2 track/artist search (isSynced=${best.isSynced})")
                    return@withContext best
                }
            }

            // ── Tier 3: General query search (q=Title Artist) ──
            val qParam = URLEncoder.encode("$cleanTitle $cleanArtist", "UTF-8")
            val searchUrl2 = "https://lrclib.net/api/search?q=$qParam"
            val searchBody2 = fetchJson(searchUrl2)
            if (searchBody2 != null) {
                val best = pickBestFromSearchResults(searchBody2, cleanArtist, cleanTitle, durationSec)
                if (best != null) {
                    Log.i(TAG, "Found best lyrics via Tier 3 q-search (isSynced=${best.isSynced})")
                    return@withContext best
                }
            }

            // ── Tier 4: Direct get without duration fallback ──
            val fallbackUrl = "https://lrclib.net/api/get?artist_name=$encArtist&track_name=$encTitle"
            val fallbackBody = fetchJson(fallbackUrl)
            if (fallbackBody != null) {
                val candidate = parseCandidate(JSONObject(fallbackBody), durationSec)
                if (candidate != null) {
                    Log.i(TAG, "Found lyrics via Tier 4 fallback direct get (isSynced=${candidate.isSynced})")
                    return@withContext candidate
                }
            }

            Log.w(TAG, "No lyrics found for '$cleanTitle' by '$cleanArtist'")
            null
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get lyrics: ${e.message}", e)
            null
        }
    }

    private fun parseCandidate(json: JSONObject, durationSec: Int): TrackLyrics? {
        val synced = json.optString("syncedLyrics", "").takeIf { it.isNotBlank() }
        if (synced != null) {
            val lines = parseSyncedLines(synced)
            if (lines.isNotEmpty()) {
                return TrackLyrics(
                    isSynced = true,
                    lines = lines,
                    plainLyrics = json.optString("plainLyrics", null)
                )
            }
        }

        val plain = json.optString("plainLyrics", "").takeIf { it.isNotBlank() }
        if (plain != null) {
            val rawLines = plain.split("\n").map { it.trim() }.filter { it.isNotEmpty() }
            val lines = rawLines.mapIndexed { idx, txt ->
                LyricLine(timeSec = idx * 4f, timeMs = idx * 4000L, text = txt)
            }
            return TrackLyrics(
                isSynced = false,
                lines = lines,
                plainLyrics = plain
            )
        }

        return null
    }

    private fun pickBestFromSearchResults(
        jsonString: String,
        targetArtist: String,
        targetTitle: String,
        durationSec: Int
    ): TrackLyrics? {
        return try {
            val array = JSONArray(jsonString)
            if (array.length() == 0) return null

            var bestLyrics: TrackLyrics? = null
            var bestScore = -10000

            for (i in 0 until array.length()) {
                val item = array.optJSONObject(i) ?: continue
                val syncedLyrics = item.optString("syncedLyrics", "")
                val plainLyrics = item.optString("plainLyrics", "")
                if (syncedLyrics.isBlank() && plainLyrics.isBlank()) continue

                val itemDuration = item.optDouble("duration", 0.0).toInt()
                val itemArtist = item.optString("artistName", "")
                val itemTitle = item.optString("trackName", "")

                var score = 0

                // 1. Synced lyrics is heavily preferred (+1500)
                val hasSync = syncedLyrics.isNotBlank()
                if (hasSync) score += 1500

                // 2. Duration proximity
                if (durationSec > 0 && itemDuration > 0) {
                    val diff = abs(itemDuration - durationSec)
                    when {
                        diff <= 3 -> score += 600
                        diff <= 8 -> score += 350
                        diff <= 18 -> score += 100
                        else -> score -= (diff * 20).coerceAtMost(800)
                    }
                }

                // 3. Artist match bonus
                if (itemArtist.contains(targetArtist, ignoreCase = true) || targetArtist.contains(itemArtist, ignoreCase = true)) {
                    score += 400
                }

                // 4. Word-level synchronization flag
                if (item.optBoolean("hasWordSync", false)) {
                    score += 200
                }

                // 5. Check first line timing to detect false intro delays (e.g. 51s intro on a 25s intro song)
                if (hasSync) {
                    val lines = parseSyncedLines(syncedLyrics)
                    if (lines.isNotEmpty()) {
                        val firstLineTime = lines.first().timeSec
                        // If duration is around 240-300s and first line is > 48s, penalize suspicious long offset
                        if (firstLineTime in 5f..38f) {
                            score += 200 // standard intro timing
                        } else if (firstLineTime > 45f && durationSec in 150..320) {
                            score -= 300 // suspicious offset!
                        }
                    }
                }

                if (score > bestScore) {
                    val parsed = parseCandidate(item, durationSec)
                    if (parsed != null) {
                        bestScore = score
                        bestLyrics = parsed
                    }
                }
            }

            bestLyrics
        } catch (e: Exception) {
            Log.w(TAG, "Error parsing search results: ${e.message}")
            null
        }
    }
}
