package com.music.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.Crossfade
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import com.music.app.core.designsystem.components.BottomNav
import com.music.app.core.designsystem.components.NavTab
import com.music.app.core.designsystem.components.TopCapsule
import com.music.app.core.designsystem.theme.AudexFontFamily
import com.music.app.core.designsystem.theme.SepotifyTheme
import dev.chrisbanes.haze.HazeState
import dev.chrisbanes.haze.haze

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
            SepotifyTheme(darkTheme = true) {
                MainAppScreen()
            }
        }
    }
}

// Dummy track model for Phase 1 visual verification
data class DummyTrack(
    val id: String,
    val title: String,
    val artist: String,
    val duration: String,
    val gradientColors: List<Color>
)

val SampleTracks = listOf(
    DummyTrack(
        id = "1",
        title = "Cheshme Man",
        artist = "Dariush",
        duration = "4:57",
        gradientColors = listOf(Color(0xFFE65100), Color(0xFFF57C00), Color(0xFF263238))
    ),
    DummyTrack(
        id = "2",
        title = "The Winner Takes It All",
        artist = "ABBA",
        duration = "4:55",
        gradientColors = listOf(Color(0xFF1E88E5), Color(0xFF0D47A1), Color(0xFF1A237E))
    ),
    DummyTrack(
        id = "3",
        title = "Garageband Jam Session",
        artist = "newbi3",
        duration = "5:02",
        gradientColors = listOf(Color(0xFFD81B60), Color(0xFF880E4F), Color(0xFF311B92))
    ),
    DummyTrack(
        id = "4",
        title = "c418_warmth",
        artist = "C418",
        duration = "3:59",
        gradientColors = listOf(Color(0xFF00897B), Color(0xFF004D40), Color(0xFF263238))
    ),
    DummyTrack(
        id = "5",
        title = "Midnight City",
        artist = "M83",
        duration = "4:04",
        gradientColors = listOf(Color(0xFF7B1FA2), Color(0xFF4A148C), Color(0xFF12005E))
    ),
    DummyTrack(
        id = "6",
        title = "Starboy",
        artist = "The Weeknd ft. Daft Punk",
        duration = "3:50",
        gradientColors = listOf(Color(0xFFD32F2F), Color(0xFFB71C1C), Color(0xFF212121))
    ),
    DummyTrack(
        id = "7",
        title = "Get Lucky",
        artist = "Daft Punk ft. Pharrell",
        duration = "4:08",
        gradientColors = listOf(Color(0xFFFBC02D), Color(0xFFF57F17), Color(0xFF3E2723))
    ),
    DummyTrack(
        id = "8",
        title = "Blinding Lights",
        artist = "The Weeknd",
        duration = "3:20",
        gradientColors = listOf(Color(0xFFE91E63), Color(0xFF880E4F), Color(0xFF1A1A24))
    )
)

@Composable
fun MainAppScreen() {
    var activeTab by remember { mutableStateOf(NavTab.HOME) }
    val hazeState = remember { HazeState() }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF07080B))
    ) {
        // Scrollable content registered as haze source for real-time background blur
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .haze(state = hazeState),
            contentPadding = PaddingValues(top = 135.dp, bottom = 120.dp, start = 16.dp, end = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Text(
                    text = when (activeTab) {
                        NavTab.HOME -> "Recently Played"
                        NavTab.SEARCH -> "Explore Music"
                        NavTab.LIBRARY -> "Your Library"
                    },
                    fontFamily = AudexFontFamily,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFFEDEDED),
                    modifier = Modifier.padding(bottom = 8.dp)
                )
            }

            // Featured Horizontal Carousel
            item {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(SampleTracks.take(4)) { track ->
                        Box(
                            modifier = Modifier
                                .size(140.dp)
                                .clip(RoundedCornerShape(18.dp))
                                .background(
                                    brush = Brush.linearGradient(track.gradientColors)
                                )
                                .padding(12.dp),
                            contentAlignment = Alignment.BottomStart
                        ) {
                            Column {
                                Text(
                                    text = track.title,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White,
                                    maxLines = 1
                                )
                                Text(
                                    text = track.artist,
                                    fontSize = 11.sp,
                                    color = Color.White.copy(alpha = 0.8f),
                                    maxLines = 1
                                )
                            }
                        }
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Songs",
                    fontFamily = AudexFontFamily,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFFEDEDED),
                    modifier = Modifier.padding(bottom = 4.dp)
                )
            }

            // Vertical list of songs
            items(SampleTracks) { track ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color(0xFF13151D).copy(alpha = 0.6f))
                        .padding(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(
                                brush = Brush.linearGradient(track.gradientColors)
                            )
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = track.title,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFFEDEDED)
                        )
                        Text(
                            text = track.artist,
                            fontSize = 12.sp,
                            color = Color(0xFFA1A1A6)
                        )
                    }
                    Text(
                        text = track.duration,
                        fontSize = 12.sp,
                        color = Color(0xFF71717A)
                    )
                }
            }
        }

        // Top Glass Capsule (Dock)
        TopCapsule(
            title = when (activeTab) {
                NavTab.HOME -> "Home"
                NavTab.SEARCH -> "Search"
                NavTab.LIBRARY -> "Library"
            },
            hazeState = hazeState,
            modifier = Modifier.align(Alignment.TopCenter)
        )

        // Bottom Glass Navigation Dock
        BottomNav(
            activeTab = activeTab,
            onTabSelected = { activeTab = it },
            isPlaying = true,
            hazeState = hazeState,
            modifier = Modifier.align(Alignment.BottomCenter)
        )
    }
}
