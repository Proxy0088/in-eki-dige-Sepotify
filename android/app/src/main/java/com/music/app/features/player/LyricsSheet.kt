package com.music.app.features.player

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.music.app.core.designsystem.components.LiquidGlassSurface
import com.music.app.core.designsystem.components.LiquidGlassVariant
import com.music.app.core.designsystem.theme.AudexFontFamily
import com.music.app.core.model.Track
import com.music.app.core.network.LyricsService
import com.music.app.core.network.TrackLyrics
import dev.chrisbanes.haze.HazeState

/**
 * Dedicated Full Liquid Glass Synced Lyrics Sheet / Window.
 * - Dynamic LRCLIB synchronized lyrics
 * - Real-time auto-scrolling karaoke view
 * - Tap any line to seek player
 * - Liquid glass design matching ECC-2.2.3 Liquid Glass specification
 */
@Composable
fun LyricsSheet(
    track: Track?,
    currentTimeSec: Int,
    durationSec: Int,
    onSeek: (Float) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    hazeState: HazeState? = null
) {
    if (track == null) return

    var lyricsData by remember(track.id) { mutableStateOf<TrackLyrics?>(null) }
    var isLoading by remember(track.id) { mutableStateOf(true) }
    val listState = rememberLazyListState()

    // Fetch real lyrics from LRCLIB
    LaunchedEffect(track.id) {
        isLoading = true
        lyricsData = LyricsService.getLyrics(track.artist, track.title, durationSec)
        isLoading = false
    }

    val lines = lyricsData?.lines ?: emptyList()
    val currentTimeMs = currentTimeSec * 1000L

    // Active line index calculation
    val activeIndex = remember(currentTimeMs, lines) {
        if (lines.isEmpty()) -1
        else {
            var found = -1
            for (i in lines.indices.reversed()) {
                if (currentTimeMs >= lines[i].timeMs) {
                    found = i
                    break
                }
            }
            if (found == -1 && lines.isNotEmpty()) 0 else found
        }
    }

    // Auto-scroll to active line
    LaunchedEffect(activeIndex) {
        if (activeIndex >= 0 && activeIndex < lines.size) {
            val targetScroll = (activeIndex - 2).coerceAtLeast(0)
            listState.animateScrollToItem(targetScroll)
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.65f))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onDismiss
            ),
        contentAlignment = Alignment.BottomCenter
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.85f)
                .navigationBarsPadding()
                .padding(horizontal = 10.dp, vertical = 8.dp)
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    onClick = {} // consume
                )
        ) {
            LiquidGlassSurface(
                modifier = Modifier.fillMaxSize(),
                hazeState = hazeState,
                shape = RoundedCornerShape(32.dp),
                variant = LiquidGlassVariant.Card,
                blurRadius = 32.dp,
                customBaseColor = Color(0xDE0B0E17),
                borderWidth = 1.dp,
                showTopHighlight = true
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 22.dp, vertical = 18.dp)
                ) {
                    // Top Drag Indicator Handle
                    Box(
                        modifier = Modifier
                            .align(Alignment.CenterHorizontally)
                            .width(42.dp)
                            .height(4.dp)
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.28f))
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Header: Track preview & Close button
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.weight(1f)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(46.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(Brush.linearGradient(track.gradientColors)),
                                contentAlignment = Alignment.Center
                            ) {
                                if (!track.coverUrl.isNullOrEmpty()) {
                                    AsyncImage(
                                        model = track.coverUrl,
                                        contentDescription = track.title,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier.fillMaxSize()
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.width(12.dp))

                            Column {
                                Text(
                                    text = track.title,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFFEDEDED),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = if (lyricsData?.isSynced == true) "Synced Lyrics • LRCLIB" else "Lyrics • ${track.artist}",
                                    fontSize = 12.sp,
                                    color = if (lyricsData?.isSynced == true) Color(0xFF22D3EE) else Color(0xFFA1A1A6),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }

                        IconButton(
                            onClick = onDismiss,
                            modifier = Modifier.size(34.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Close Lyrics",
                                tint = Color(0xFFA1A1A6),
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Content Area: Loading / Lyrics list / Empty
                    if (isLoading) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(32.dp),
                                    color = Color(0xFF22D3EE),
                                    strokeWidth = 2.5.dp
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                Text(
                                    text = "Loading lyrics...",
                                    fontSize = 13.sp,
                                    color = Color(0xFFA1A1A6)
                                )
                            }
                        }
                    } else if (lines.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.MusicNote,
                                    contentDescription = "No Lyrics",
                                    tint = Color(0xFF71717A),
                                    modifier = Modifier.size(42.dp)
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                Text(
                                    text = "No lyrics found for this song",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = Color(0xFFEDEDED)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Lyrics are synchronized via LRCLIB catalog",
                                    fontSize = 12.sp,
                                    color = Color(0xFFA1A1A6),
                                    textAlign = TextAlign.Center
                                )
                            }
                        }
                    } else {
                        val activeGlowColor = remember(track.id, track.gradientColors) {
                            val dom = track.gradientColors.firstOrNull() ?: Color(0xFF22D3EE)
                            val sec = track.gradientColors.lastOrNull() ?: dom
                            getActiveLyricColor(dom, sec)
                        }
                        LazyColumn(
                            state = listState,
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f),
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            itemsIndexed(lines) { index, line ->
                                val isActive = index == activeIndex

                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(14.dp))
                                        .clickable {
                                            onSeek(line.timeSec)
                                        }
                                        .padding(vertical = 8.dp, horizontal = 12.dp)
                                ) {
                                    Text(
                                        text = line.text,
                                        fontFamily = AudexFontFamily,
                                        fontSize = if (isActive) 22.sp else 16.sp,
                                        fontWeight = if (isActive) FontWeight.Bold else FontWeight.Normal,
                                        color = if (isActive) activeGlowColor else Color(0xFF9CA3AF).copy(alpha = 0.60f),
                                        lineHeight = if (isActive) 28.sp else 22.sp
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
