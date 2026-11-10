package com.music.app.core.network

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.net.URLEncoder
import java.util.concurrent.TimeUnit
import java.util.regex.Pattern

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
    private val client = OkHttpClient.Builder()
        .connectTimeout(6, TimeUnit.SECONDS)
        .readTimeout(6, TimeUnit.SECONDS)
        .build()

    private val SYNCED_REGEX = Pattern.compile("\\[(\\d{2}):(\\d{2}(?:\\.\\d+)?)\\](.*)")

    suspend fun getLyrics(artist: String, title: String, durationSec: Int = 0): TrackLyrics? = withContext(Dispatchers.IO) {
        try {
            val cleanArtist = artist.replace(Regex("\\(.*?\\)"), "").replace("- Topic", "").trim()
            val cleanTitle = title
                .replace(Regex("\\(.*?\\)"), "")
                .replace(Regex("\\[.*?\\]"), "")
                .replace(Regex("(?i)official\\s*(music\\s*)?video"), "")
                .replace(Regex("(?i)lyrics?"), "")
                .trim()

            var url = "https://lrclib.net/api/get?artist_name=${URLEncoder.encode(cleanArtist, "UTF-8")}&track_name=${URLEncoder.encode(cleanTitle, "UTF-8")}"
            if (durationSec > 0) {
                url += "&duration=$durationSec"
            }

            val request = Request.Builder()
                .url(url)
                .header("User-Agent", "Sepotify/1.0 (Android)")
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return@withContext null
                val bodyStr = response.body?.string() ?: return@withContext null
                val json = JSONObject(bodyStr)

                val syncedLyrics = json.optString("syncedLyrics", "").takeIf { it.isNotBlank() }
                if (syncedLyrics != null) {
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
                    if (lines.isNotEmpty()) {
                        return@withContext TrackLyrics(
                            isSynced = true,
                            lines = lines,
                            plainLyrics = json.optString("plainLyrics", null)
                        )
                    }
                }

                val plainLyrics = json.optString("plainLyrics", "").takeIf { it.isNotBlank() }
                if (plainLyrics != null) {
                    val rawLines = plainLyrics.split("\n").map { it.trim() }.filter { it.isNotEmpty() }
                    val lines = rawLines.mapIndexed { idx, txt ->
                        LyricLine(timeSec = idx * 4f, timeMs = idx * 4000L, text = txt)
                    }
                    return@withContext TrackLyrics(
                        isSynced = false,
                        lines = lines,
                        plainLyrics = plainLyrics
                    )
                }
                null
            }
        } catch (e: Exception) {
            android.util.Log.w("LyricsService", "Failed to fetch lyrics: ${e.message}")
            null
        }
    }
}
