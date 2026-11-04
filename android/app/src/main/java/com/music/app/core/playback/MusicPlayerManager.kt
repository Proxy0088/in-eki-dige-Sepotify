package com.music.app.core.playback

import android.content.ComponentName
import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.ListenableFuture
import com.music.app.core.model.Track
import com.music.app.core.network.newpipe.StreamResolver
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class MusicPlayerManager(private val context: Context) {

    companion object {
        private const val TAG = "MusicPlayerManager"
    }

    private val scope = CoroutineScope(Dispatchers.Main + Job())

    private var controllerFuture: ListenableFuture<MediaController>? = null
    private var controller: MediaController? = null
    private var pendingPlayAction: (() -> Unit)? = null

    private val _currentTrack = MutableStateFlow<Track?>(null)
    val currentTrack: StateFlow<Track?> = _currentTrack.asStateFlow()

    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying.asStateFlow()

    private val _currentPositionMs = MutableStateFlow(0L)
    val currentPositionMs: StateFlow<Long> = _currentPositionMs.asStateFlow()

    private val _durationMs = MutableStateFlow(1L)
    val durationMs: StateFlow<Long> = _durationMs.asStateFlow()

    private val _progress = MutableStateFlow(0f)
    val progress: StateFlow<Float> = _progress.asStateFlow()

    private val _isShuffle = MutableStateFlow(false)
    val isShuffle: StateFlow<Boolean> = _isShuffle.asStateFlow()

    private val _repeatMode = MutableStateFlow(Player.REPEAT_MODE_OFF)
    val repeatMode: StateFlow<Int> = _repeatMode.asStateFlow()

    private val _playbackNotice = MutableStateFlow<String?>(null)
    val playbackNotice: StateFlow<String?> = _playbackNotice.asStateFlow()

    private var playlistQueue: List<Track> = emptyList()
    private var positionUpdateJob: Job? = null
    private var consecutiveFailures = 0

    init {
        connectToService()
    }

    private fun connectToService() {
        val sessionToken = SessionToken(context, ComponentName(context, PlaybackService::class.java))
        val future = MediaController.Builder(context, sessionToken).buildAsync()
        controllerFuture = future

        future.addListener({
            try {
                val mediaController = future.get()
                controller = mediaController
                setupPlayerListener(mediaController)
                pendingPlayAction?.invoke()
                pendingPlayAction = null
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }, ContextCompat.getMainExecutor(context))
    }

    private fun setupPlayerListener(player: Player) {
        player.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                _isPlaying.value = isPlaying
                if (isPlaying) {
                    consecutiveFailures = 0
                    startPositionUpdates()
                } else {
                    stopPositionUpdates()
                }
            }

            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_READY) {
                    val dur = player.duration.coerceAtLeast(1L)
                    _durationMs.value = dur
                    updateProgress()
                    consecutiveFailures = 0
                }
            }

            override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
                val currentId = mediaItem?.mediaId
                val matched = playlistQueue.find { it.id == currentId }
                if (matched != null) {
                    _currentTrack.value = matched
                    prefetchNextTrack(matched)
                }
                updateProgress()
            }

            override fun onPlayerError(error: PlaybackException) {
                Log.e(TAG, "Playback error: ${error.errorCodeName} (${error.errorCode}) - ${error.message}", error)
                consecutiveFailures++

                if (consecutiveFailures >= playlistQueue.size) {
                    Log.w(TAG, "All $consecutiveFailures tracks in queue failed. Stopping playback.")
                    _playbackNotice.value = "All tracks unavailable. Playback stopped."
                    player.stop()
                    player.clearMediaItems()
                    _isPlaying.value = false
                    consecutiveFailures = 0
                } else {
                    val trackTitle = _currentTrack.value?.title ?: "Track"
                    _playbackNotice.value = "$trackTitle unavailable, skipping to next..."
                    skipToNext()
                }
            }
        })

        _isPlaying.value = player.isPlaying
        _isShuffle.value = player.shuffleModeEnabled
        _repeatMode.value = player.repeatMode
    }

    /**
     * Feeds the complete queue to ExoPlayer simultaneously.
     * YouTube tracks use resolving URIs (`yt://<videoId>`), allowing YouTubeResolvingDataSource
     * to resolve each track seamlessly when its turn comes.
     */
    fun playTrack(track: Track, queue: List<Track> = emptyList()) {
        _currentTrack.value = track
        val newQueue = if (queue.isNotEmpty()) queue else listOf(track)
        playlistQueue = newQueue
        consecutiveFailures = 0

        val player = controller
        if (player == null) {
            pendingPlayAction = { playTrack(track, queue) }
            return
        }

        val mediaItems = newQueue.map { t ->
            val uri = when {
                t.id.startsWith("yt-") -> Uri.parse("yt://${t.id.removePrefix("yt-")}")
                t.url.startsWith("yt://") -> Uri.parse(t.url)
                t.url.isNotEmpty() -> Uri.parse(t.url)
                t.id.startsWith("itunes-") -> {
                    val encodedArtist = java.net.URLEncoder.encode(t.artist, "UTF-8")
                    val encodedTitle = java.net.URLEncoder.encode(t.title, "UTF-8")
                    Uri.parse("itunes://${t.id}?artist=$encodedArtist&title=$encodedTitle")
                }
                !t.isNationalNet -> Uri.parse("yt://${t.id}")
                else -> Uri.EMPTY
            }

            val metadata = MediaMetadata.Builder()
                .setTitle(t.title)
                .setArtist(t.artist)
                .setAlbumTitle(t.album)
                .apply {
                    if (!t.coverUrl.isNullOrEmpty()) {
                        setArtworkUri(Uri.parse(t.coverUrl))
                    }
                }
                .build()

            MediaItem.Builder()
                .setMediaId(t.id)
                .setUri(uri)
                .setMediaMetadata(metadata)
                .build()
        }

        val startIndex = newQueue.indexOfFirst { it.id == track.id }.coerceAtLeast(0)
        player.setMediaItems(mediaItems, startIndex, 0L)
        player.prepare()
        player.play()

        // Prefetch the upcoming track for gapless playback
        prefetchNextTrack(track)
    }

    private fun prefetchNextTrack(current: Track) {
        val currIndex = playlistQueue.indexOfFirst { it.id == current.id }
        if (currIndex in 0 until playlistQueue.size - 1) {
            val nextTrack = playlistQueue[currIndex + 1]
            if (nextTrack.id.startsWith("itunes-")) {
                scope.launch {
                    StreamResolver.prefetchTrack(nextTrack.id, nextTrack.title, nextTrack.artist)
                }
            } else if (nextTrack.id.startsWith("yt-") || !nextTrack.isNationalNet) {
                scope.launch {
                    val vid = nextTrack.id.removePrefix("yt-")
                    StreamResolver.prefetch(vid)
                }
            }
        }
    }

    fun clearPlaybackNotice() {
        _playbackNotice.value = null
    }

    fun togglePlay() {
        val player = controller ?: return
        if (player.isPlaying) {
            player.pause()
        } else {
            player.play()
        }
    }

    fun pause() {
        controller?.pause()
    }

    fun resume() {
        controller?.play()
    }

    fun skipToNext() {
        val player = controller ?: return
        if (player.hasNextMediaItem()) {
            player.seekToNextMediaItem()
            player.prepare()
            player.play()
        } else if (playlistQueue.isNotEmpty()) {
            val nextTrack = playlistQueue.first()
            playTrack(nextTrack, playlistQueue)
        }
    }

    fun skipToPrevious() {
        val player = controller ?: return
        if (player.hasPreviousMediaItem()) {
            player.seekToPreviousMediaItem()
            player.prepare()
            player.play()
        } else if (playlistQueue.isNotEmpty()) {
            val prevTrack = playlistQueue.last()
            playTrack(prevTrack, playlistQueue)
        }
    }

    fun seekToProgress(progress: Float) {
        val player = controller ?: return
        val duration = player.duration.coerceAtLeast(1L)
        val targetPos = (progress * duration).toLong()
        player.seekTo(targetPos)
        _progress.value = progress
        _currentPositionMs.value = targetPos
    }

    fun toggleShuffle() {
        val player = controller ?: return
        val newShuffle = !player.shuffleModeEnabled
        player.shuffleModeEnabled = newShuffle
        _isShuffle.value = newShuffle
    }

    fun toggleRepeat() {
        val player = controller ?: return
        val newMode = when (player.repeatMode) {
            Player.REPEAT_MODE_OFF -> Player.REPEAT_MODE_ALL
            Player.REPEAT_MODE_ALL -> Player.REPEAT_MODE_ONE
            else -> Player.REPEAT_MODE_OFF
        }
        player.repeatMode = newMode
        _repeatMode.value = newMode
    }

    private fun startPositionUpdates() {
        positionUpdateJob?.cancel()
        positionUpdateJob = scope.launch {
            while (isActive) {
                updateProgress()
                delay(300)
            }
        }
    }

    private fun stopPositionUpdates() {
        positionUpdateJob?.cancel()
        positionUpdateJob = null
    }

    private fun updateProgress() {
        val player = controller ?: return
        val pos = player.currentPosition.coerceAtLeast(0L)
        val dur = player.duration.coerceAtLeast(1L)
        _currentPositionMs.value = pos
        _durationMs.value = dur
        _progress.value = (pos.toFloat() / dur.toFloat()).coerceIn(0f, 1f)
    }

    fun release() {
        stopPositionUpdates()
        controllerFuture?.let { MediaController.releaseFuture(it) }
        controller = null
        pendingPlayAction = null
    }
}
