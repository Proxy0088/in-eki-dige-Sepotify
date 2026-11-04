package com.music.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.music.app.core.data.UserPreferencesRepository
import com.music.app.core.designsystem.components.BottomNav
import com.music.app.core.designsystem.components.NavTab
import com.music.app.core.designsystem.components.NetworkStatus
import com.music.app.core.designsystem.components.NetworkStatusToast
import com.music.app.core.designsystem.components.TopCapsule
import com.music.app.core.designsystem.theme.SepotifyTheme
import com.music.app.core.media.MediaStoreScanner
import com.music.app.core.model.SAMPLE_TRACKS
import com.music.app.core.model.Track
import com.music.app.core.playback.MusicPlayerManager
import com.music.app.features.home.HomeScreen
import com.music.app.features.library.AskListLibraryModal
import com.music.app.features.library.LibraryScreen
import com.music.app.features.player.FullScreenPlayer
import com.music.app.features.player.WhenPlayingWidget
import com.music.app.features.search.SearchScreen
import com.music.app.features.settings.SettingsModal
import com.music.app.features.social.SocialAccountModal
import dev.chrisbanes.haze.HazeState
import dev.chrisbanes.haze.haze
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {

    private var playerManager: MusicPlayerManager? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Native Edge-to-Edge full immersion
        enableEdgeToEdge()
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = android.graphics.Color.TRANSPARENT
        window.navigationBarColor = android.graphics.Color.TRANSPARENT

        val insetsController = WindowCompat.getInsetsController(window, window.decorView)
        insetsController.isAppearanceLightStatusBars = false
        insetsController.isAppearanceLightNavigationBars = false

        playerManager = MusicPlayerManager(this)

        setContent {
            val context = LocalContext.current
            val prefsRepo = remember { UserPreferencesRepository(context) }
            val isDarkTheme by prefsRepo.isDarkTheme.collectAsStateWithLifecycle(initialValue = true)
            val scope = rememberCoroutineScope()

            SepotifyTheme(darkTheme = isDarkTheme) {
                MainAppScreen(
                    playerManager = playerManager!!,
                    prefsRepo = prefsRepo,
                    isDarkTheme = isDarkTheme,
                    onToggleTheme = { dark ->
                        scope.launch { prefsRepo.setDarkTheme(dark) }
                    }
                )
            }
        }
    }

    override fun onDestroy() {
        playerManager?.release()
        playerManager = null
        super.onDestroy()
    }
}

@Composable
fun MainAppScreen(
    playerManager: MusicPlayerManager,
    prefsRepo: UserPreferencesRepository,
    isDarkTheme: Boolean,
    onToggleTheme: (Boolean) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var activeTab by remember { mutableStateOf(NavTab.HOME) }
    var isPlayerExpanded by remember { mutableStateOf(false) }

    // Collect states from ExoPlayer / MusicPlayerManager
    val isPlaying by playerManager.isPlaying.collectAsStateWithLifecycle()
    val activePlayingTrack by playerManager.currentTrack.collectAsStateWithLifecycle()
    val playbackProgress by playerManager.progress.collectAsStateWithLifecycle()
    val currentPositionMs by playerManager.currentPositionMs.collectAsStateWithLifecycle()

    // Collect preferences from DataStore
    val likedIds by prefsRepo.likedTrackIds.collectAsStateWithLifecycle(initialValue = emptySet())
    val isNationalNet by prefsRepo.isNationalNet.collectAsStateWithLifecycle(initialValue = false)
    val networkStatus by remember { mutableStateOf(NetworkStatus.IDLE) }

    // Modals visibility
    var showSettingsModal by remember { mutableStateOf(false) }
    var showSocialModal by remember { mutableStateOf(false) }
    var showAskListModal by remember { mutableStateOf(false) }

    // Single stable Root HazeState covering the entire screen content
    val rootHazeState = remember { HazeState() }

    // Dynamic track list allowing like, download, and local MediaStore additions
    val tracksList = remember { mutableStateListOf<Track>().apply { addAll(SAMPLE_TRACKS) } }
    val displayCurrentTrack = activePlayingTrack ?: tracksList.firstOrNull()

    fun loadLocalTracks() {
        scope.launch(Dispatchers.IO) {
            val localTracks = MediaStoreScanner.scanDeviceAudio(context)
            if (localTracks.isNotEmpty()) {
                withContext(Dispatchers.Main) {
                    val existingIds = tracksList.map { it.id }.toSet()
                    val newTracks = localTracks.filterNot { existingIds.contains(it.id) }
                    tracksList.addAll(newTracks)
                }
            }
        }
    }

    // Permission launcher for MediaStore and Notifications
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val audioGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions[Manifest.permission.READ_MEDIA_AUDIO] == true
        } else {
            permissions[Manifest.permission.READ_EXTERNAL_STORAGE] == true
        }

        if (audioGranted) {
            loadLocalTracks()
        }
    }

    // Launch permission request & local media scan on start
    LaunchedEffect(Unit) {
        val hasAudioPermission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.READ_MEDIA_AUDIO
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.READ_EXTERNAL_STORAGE
            ) == PackageManager.PERMISSION_GRANTED
        }

        if (hasAudioPermission) {
            loadLocalTracks()
        } else {
            val permissions = mutableListOf<String>()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                permissions.add(Manifest.permission.READ_MEDIA_AUDIO)
                permissions.add(Manifest.permission.POST_NOTIFICATIONS)
            } else {
                permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE)
            }
            permissionLauncher.launch(permissions.toTypedArray())
        }
    }

    // Synchronize liked state in tracksList
    val syncedTracksList = remember(tracksList.toList(), likedIds) {
        tracksList.map { track ->
            track.copy(isLiked = likedIds.contains(track.id))
        }
    }

    val likedCount = syncedTracksList.count { it.isLiked }
    val downloadedCount = syncedTracksList.count { it.isDownloaded }

    BackHandler(enabled = isPlayerExpanded || showSettingsModal || showSocialModal || showAskListModal) {
        when {
            showAskListModal -> showAskListModal = false
            showSettingsModal -> showSettingsModal = false
            showSocialModal -> showSocialModal = false
            isPlayerExpanded -> isPlayerExpanded = false
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(if (isDarkTheme) Color(0xFF07080B) else Color(0xFFF3F4F6))
    ) {
        // ── Single Permanent Full-Screen Haze Source ──
        // Placing haze here ensures that tab transitions, scrolling, or modal opens NEVER unregister or freeze blur!
        Box(
            modifier = Modifier
                .fillMaxSize()
                .haze(state = rootHazeState)
        ) {
            AnimatedContent(
                targetState = activeTab,
                transitionSpec = {
                    fadeIn(animationSpec = spring(stiffness = Spring.StiffnessMediumLow)) togetherWith
                    fadeOut(animationSpec = spring(stiffness = Spring.StiffnessMediumLow))
                },
                label = "screen_tab_switch",
                modifier = Modifier.fillMaxSize()
            ) { tab ->
                when (tab) {
                    NavTab.HOME -> {
                        HomeScreen(
                            tracks = syncedTracksList,
                            currentTrack = displayCurrentTrack,
                            isPlaying = isPlaying,
                            onPlayTrack = { track ->
                                playerManager.playTrack(track, syncedTracksList)
                            },
                            onToggleLike = { track ->
                                scope.launch { prefsRepo.toggleLike(track.id) }
                            },
                            onToggleDownload = { track ->
                                val idx = tracksList.indexOfFirst { it.id == track.id }
                                if (idx >= 0) {
                                    tracksList[idx] = tracksList[idx].copy(isDownloaded = !tracksList[idx].isDownloaded)
                                }
                            }
                        )
                    }

                    NavTab.SEARCH -> {
                        SearchScreen(
                            tracks = syncedTracksList,
                            currentTrack = displayCurrentTrack,
                            isPlaying = isPlaying,
                            onPlayTrack = { track ->
                                playerManager.playTrack(track, syncedTracksList)
                            },
                            onToggleLike = { track ->
                                scope.launch { prefsRepo.toggleLike(track.id) }
                            },
                            onToggleDownload = { track ->
                                val idx = tracksList.indexOfFirst { it.id == track.id }
                                if (idx >= 0) {
                                    tracksList[idx] = tracksList[idx].copy(isDownloaded = !tracksList[idx].isDownloaded)
                                }
                            }
                        )
                    }

                    NavTab.LIBRARY -> {
                        LibraryScreen(
                            tracks = syncedTracksList,
                            currentTrack = displayCurrentTrack,
                            isPlaying = isPlaying,
                            onPlayTrack = { track ->
                                playerManager.playTrack(track, syncedTracksList)
                            },
                            onToggleLike = { track ->
                                scope.launch { prefsRepo.toggleLike(track.id) }
                            },
                            onToggleDownload = { track ->
                                val idx = tracksList.indexOfFirst { it.id == track.id }
                                if (idx >= 0) {
                                    tracksList[idx] = tracksList[idx].copy(isDownloaded = !tracksList[idx].isDownloaded)
                                }
                            }
                        )
                    }
                }
            }
        }

        // ── Top Glass Capsule (Dock) ──
        TopCapsule(
            title = when (activeTab) {
                NavTab.HOME -> "Home"
                NavTab.SEARCH -> "Search"
                NavTab.LIBRARY -> "Library"
            },
            hazeState = rootHazeState,
            onProfileClick = { showSocialModal = true },
            modifier = Modifier.align(Alignment.TopCenter)
        )

        // ── Network Status Toast ──
        NetworkStatusToast(
            status = networkStatus,
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 92.dp)
        )

        // ── Floating Mini Player Widget (Docked directly above BottomNav) ──
        WhenPlayingWidget(
            currentTrack = displayCurrentTrack,
            isPlaying = isPlaying,
            progress = playbackProgress,
            onTogglePlay = { playerManager.togglePlay() },
            onNextTrack = { playerManager.skipToNext() },
            onOpenPlayer = { isPlayerExpanded = true },
            hazeState = rootHazeState,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(bottom = 80.dp)
        )

        // ── Bottom Glass Navigation Dock ──
        BottomNav(
            activeTab = activeTab,
            onTabSelected = { activeTab = it },
            isPlaying = isPlaying,
            hazeState = rootHazeState,
            modifier = Modifier.align(Alignment.BottomCenter)
        )

        // ── FullScreen Player (Animated Slide-up overlay with dedicated Haze) ──
        AnimatedVisibility(
            visible = isPlayerExpanded,
            enter = slideInVertically(
                initialOffsetY = { it },
                animationSpec = spring(stiffness = Spring.StiffnessMediumLow, dampingRatio = 0.85f)
            ) + fadeIn(),
            exit = slideOutVertically(
                targetOffsetY = { it },
                animationSpec = spring(stiffness = Spring.StiffnessMediumLow, dampingRatio = 0.85f)
            ) + fadeOut()
        ) {
            if (displayCurrentTrack != null) {
                FullScreenPlayer(
                    track = displayCurrentTrack,
                    isPlaying = isPlaying,
                    currentTimeSec = (currentPositionMs / 1000).toInt(),
                    durationSec = displayCurrentTrack.duration,
                    onBack = { isPlayerExpanded = false },
                    onTogglePlay = { playerManager.togglePlay() },
                    onNextTrack = { playerManager.skipToNext() },
                    onPreviousTrack = { playerManager.skipToPrevious() },
                    onSeek = { playerManager.seekToProgress(it) }
                )
            }
        }

        // ── Modals Layer ──
        SocialAccountModal(
            isOpen = showSocialModal,
            onClose = { showSocialModal = false },
            onOpenSettings = {
                showSocialModal = false
                showSettingsModal = true
            },
            likedCount = likedCount,
            downloadedCount = downloadedCount
        )

        SettingsModal(
            isOpen = showSettingsModal,
            onClose = { showSettingsModal = false },
            isNationalNet = isNationalNet,
            onToggleNationalNet = { enabled ->
                scope.launch { prefsRepo.setNationalNet(enabled) }
            },
            isDarkTheme = isDarkTheme,
            onToggleTheme = onToggleTheme
        )

        AskListLibraryModal(
            isOpen = showAskListModal,
            onClose = { showAskListModal = false },
            onSelectLibrary = { /* handled */ }
        )
    }
}
