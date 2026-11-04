package com.music.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat
import com.music.app.core.designsystem.components.BottomNav
import com.music.app.core.designsystem.components.NavTab
import com.music.app.core.designsystem.components.NetworkStatus
import com.music.app.core.designsystem.components.NetworkStatusToast
import com.music.app.core.designsystem.components.TopCapsule
import com.music.app.core.designsystem.theme.SepotifyTheme
import com.music.app.core.model.SAMPLE_TRACKS
import com.music.app.core.model.Track
import com.music.app.features.home.HomeScreen
import com.music.app.features.library.AskListLibraryModal
import com.music.app.features.library.LibraryScreen
import com.music.app.features.player.FullScreenPlayer
import com.music.app.features.player.WhenPlayingWidget
import com.music.app.features.search.SearchScreen
import com.music.app.features.settings.SettingsModal
import com.music.app.features.social.SocialAccountModal
import dev.chrisbanes.haze.HazeState

class MainActivity : ComponentActivity() {
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

        setContent {
            var isDarkTheme by remember { mutableStateOf(true) }

            SepotifyTheme(darkTheme = isDarkTheme) {
                MainAppScreen(
                    isDarkTheme = isDarkTheme,
                    onToggleTheme = { isDarkTheme = it }
                )
            }
        }
    }
}

@Composable
fun MainAppScreen(
    isDarkTheme: Boolean,
    onToggleTheme: (Boolean) -> Unit
) {
    var activeTab by remember { mutableStateOf(NavTab.HOME) }
    var currentTrackIndex by remember { mutableIntStateOf(0) }
    var isPlaying by remember { mutableStateOf(true) }
    var isPlayerExpanded by remember { mutableStateOf(false) }
    var playbackProgress by remember { mutableFloatStateOf(0.35f) }

    // Settings & Network states
    var isNationalNet by remember { mutableStateOf(false) }
    var networkStatus by remember { mutableStateOf(NetworkStatus.IDLE) }

    // Modals visibility
    var showSettingsModal by remember { mutableStateOf(false) }
    var showSocialModal by remember { mutableStateOf(false) }
    var showAskListModal by remember { mutableStateOf(false) }

    val hazeState = remember { HazeState() }

    // Dynamic track list allowing like and download mutations
    val tracksList = remember { mutableStateListOf<Track>().apply { addAll(SAMPLE_TRACKS) } }
    val currentTrack = tracksList.getOrNull(currentTrackIndex)

    val likedCount = tracksList.count { it.isLiked }
    val downloadedCount = tracksList.count { it.isDownloaded }

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
        // ── Active Screen Content (Animated Crossfade / Slide) ──
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
                        tracks = tracksList,
                        currentTrack = currentTrack,
                        isPlaying = isPlaying,
                        onPlayTrack = { track ->
                            currentTrackIndex = tracksList.indexOfFirst { it.id == track.id }.takeIf { it >= 0 } ?: 0
                            isPlaying = true
                        },
                        onToggleLike = { track ->
                            val idx = tracksList.indexOfFirst { it.id == track.id }
                            if (idx >= 0) {
                                tracksList[idx] = tracksList[idx].copy(isLiked = !tracksList[idx].isLiked)
                            }
                        },
                        onToggleDownload = { track ->
                            val idx = tracksList.indexOfFirst { it.id == track.id }
                            if (idx >= 0) {
                                tracksList[idx] = tracksList[idx].copy(isDownloaded = !tracksList[idx].isDownloaded)
                            }
                        },
                        hazeState = hazeState
                    )
                }

                NavTab.SEARCH -> {
                    SearchScreen(
                        tracks = tracksList,
                        currentTrack = currentTrack,
                        isPlaying = isPlaying,
                        onPlayTrack = { track ->
                            currentTrackIndex = tracksList.indexOfFirst { it.id == track.id }.takeIf { it >= 0 } ?: 0
                            isPlaying = true
                        },
                        onToggleLike = { track ->
                            val idx = tracksList.indexOfFirst { it.id == track.id }
                            if (idx >= 0) {
                                tracksList[idx] = tracksList[idx].copy(isLiked = !tracksList[idx].isLiked)
                            }
                        },
                        onToggleDownload = { track ->
                            val idx = tracksList.indexOfFirst { it.id == track.id }
                            if (idx >= 0) {
                                tracksList[idx] = tracksList[idx].copy(isDownloaded = !tracksList[idx].isDownloaded)
                            }
                        },
                        hazeState = hazeState
                    )
                }

                NavTab.LIBRARY -> {
                    LibraryScreen(
                        tracks = tracksList,
                        currentTrack = currentTrack,
                        isPlaying = isPlaying,
                        onPlayTrack = { track ->
                            currentTrackIndex = tracksList.indexOfFirst { it.id == track.id }.takeIf { it >= 0 } ?: 0
                            isPlaying = true
                        },
                        onToggleLike = { track ->
                            val idx = tracksList.indexOfFirst { it.id == track.id }
                            if (idx >= 0) {
                                tracksList[idx] = tracksList[idx].copy(isLiked = !tracksList[idx].isLiked)
                            }
                        },
                        onToggleDownload = { track ->
                            val idx = tracksList.indexOfFirst { it.id == track.id }
                            if (idx >= 0) {
                                tracksList[idx] = tracksList[idx].copy(isDownloaded = !tracksList[idx].isDownloaded)
                            }
                        },
                        hazeState = hazeState
                    )
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
            hazeState = hazeState,
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
            currentTrack = currentTrack,
            isPlaying = isPlaying,
            progress = playbackProgress,
            onTogglePlay = { isPlaying = !isPlaying },
            onNextTrack = {
                if (tracksList.isNotEmpty()) {
                    currentTrackIndex = (currentTrackIndex + 1) % tracksList.size
                }
            },
            onOpenPlayer = { isPlayerExpanded = true },
            hazeState = hazeState,
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
            hazeState = hazeState,
            modifier = Modifier.align(Alignment.BottomCenter)
        )

        // ── FullScreen Player (Animated Slide-up overlay) ──
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
            if (currentTrack != null) {
                FullScreenPlayer(
                    track = currentTrack,
                    isPlaying = isPlaying,
                    currentTimeSec = (playbackProgress * currentTrack.duration).toInt(),
                    durationSec = currentTrack.duration,
                    onBack = { isPlayerExpanded = false },
                    onTogglePlay = { isPlaying = !isPlaying },
                    onNextTrack = {
                        if (tracksList.isNotEmpty()) {
                            currentTrackIndex = (currentTrackIndex + 1) % tracksList.size
                        }
                    },
                    onPreviousTrack = {
                        if (tracksList.isNotEmpty()) {
                            currentTrackIndex = if (currentTrackIndex > 0) currentTrackIndex - 1 else tracksList.size - 1
                        }
                    },
                    onSeek = { playbackProgress = it },
                    hazeState = hazeState
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
            onToggleNationalNet = { isNationalNet = it },
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
