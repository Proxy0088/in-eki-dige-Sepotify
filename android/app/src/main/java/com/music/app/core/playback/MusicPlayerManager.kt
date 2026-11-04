package com.music.app.core.playback

import android.content.ComponentName
import android.content.Context
import android.net.Uri
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.MoreExecutors
import com.music.app.core.model.Track
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

    private val scope = CoroutineScope(Dispatchers.Main + Job())

    private var controllerFuture: ListenableFuture<MediaController>? = null
    private var controller: MediaController? = null

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

    private var playlistQueue: List<Track> = emptyList()
    private var positionUpdateJob: Job? = null

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
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }, MoreExecutors.directExecutor())
    }

    private fun setupPlayerListener(player: Player) {
        player.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                _isPlaying.value = isPlaying
                if (isPlaying) {
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
                }
            }

            override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
                val currentId = mediaItem?.mediaId
                val matched = playlistQueue.find { it.id == currentId }
                if (matched != null) {
                    _currentTrack.value = matched
                }
                updateProgress()
            }
        })

        _isPlaying.value = player.isPlaying
        _isShuffle.value = player.shuffleModeEnabled
        _repeatMode.value = player.repeatMode
    }

    fun playTrack(track: Track, queue: List<Track> = emptyList()) {
        _currentTrack.value = track
        playlistQueue = if (queue.isNotEmpty()) queue else listOf(track)

        val player = controller ?: return

        player.clearMediaItems()
        val mediaItems = playlistQueue.map { t ->
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
                .setUri(Uri.parse(t.url))
                .setMediaMetadata(metadata)
                .build()
        }

        player.setMediaItems(mediaItems)
        val startIndex = playlistQueue.indexOfFirst { it.id == track.id }.coerceAtLeast(0)
        player.seekTo(startIndex, 0L)
        player.prepare()
        player.play()
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
        } else if (playlistQueue.isNotEmpty()) {
            val nextTrack = playlistQueue.first()
            playTrack(nextTrack, playlistQueue)
        }
    }

    fun skipToPrevious() {
        val player = controller ?: return
        if (player.hasPreviousMediaItem()) {
            player.seekToPreviousMediaItem()
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
    }
}
