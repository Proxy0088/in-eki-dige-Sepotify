package com.music.app.core.network.newpipe

import android.util.Log
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import org.schabi.newpipe.extractor.ServiceList
import org.schabi.newpipe.extractor.stream.AudioStream
import org.schabi.newpipe.extractor.stream.StreamInfo
import java.util.concurrent.ConcurrentHashMap

object StreamResolver {
    private const val TAG = "StreamResolver"
    private const val CACHE_TTL_MS = 3 * 60 * 60 * 1000L // 3 hours

    private data class CachedStream(
        val url: String,
        val timestamp: Long = System.currentTimeMillis()
    )

    private val streamCache = ConcurrentHashMap<String, CachedStream>()

    /**
     * Resolves the direct audio stream URL with the highest bitrate compatible with ExoPlayer.
     * Runs strictly on Dispatchers.IO with full cancellation support.
     */
    suspend fun resolveStreamUrl(videoId: String, forceRefresh: Boolean = false): String? = withContext(Dispatchers.IO) {
        val cleanVideoId = videoId.removePrefix("yt-").trim()
        if (cleanVideoId.isEmpty()) return@withContext null

        if (!forceRefresh) {
            val cached = streamCache[cleanVideoId]
            if (cached != null && (System.currentTimeMillis() - cached.timestamp < CACHE_TTL_MS)) {
                return@withContext cached.url
            }
        }

        try {
            ensureActive()
            val watchUrl = "https://www.youtube.com/watch?v=$cleanVideoId"
            val service = ServiceList.YouTube
            val streamInfo = StreamInfo.getInfo(service, watchUrl)

            ensureActive()
            val audioStreams: List<AudioStream> = streamInfo.audioStreams ?: emptyList()
            if (audioStreams.isEmpty()) {
                Log.w(TAG, "No audio streams found for $cleanVideoId")
                return@withContext null
            }

            // Pick highest quality audio stream (prioritizing highest averageBitrate)
            val bestAudio = audioStreams.maxByOrNull { it.averageBitrate }
            val directUrl = bestAudio?.url ?: bestAudio?.content

            if (!directUrl.isNullOrEmpty()) {
                streamCache[cleanVideoId] = CachedStream(directUrl)
                return@withContext directUrl
            } else {
                Log.w(TAG, "Best audio stream URL was null for $cleanVideoId")
                return@withContext null
            }
        } catch (ce: CancellationException) {
            throw ce
        } catch (e: Exception) {
            Log.e(TAG, "Failed to resolve stream for videoId: $cleanVideoId", e)
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
