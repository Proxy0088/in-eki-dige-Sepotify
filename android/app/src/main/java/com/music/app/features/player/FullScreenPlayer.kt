package com.music.app.features.player

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectVerticalDragGestures
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
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Headphones
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Repeat
import androidx.compose.material.icons.filled.RepeatOne
import androidx.compose.material.icons.filled.Shuffle
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.music.app.core.designsystem.components.LiquidGlassButton
import com.music.app.core.designsystem.components.LiquidGlassSurface
import com.music.app.core.designsystem.components.LiquidGlassVariant
import com.music.app.core.designsystem.theme.AudexFontFamily
import com.music.app.core.model.Track
import dev.chrisbanes.haze.HazeState
import dev.chrisbanes.haze.haze

enum class RepeatModeState {
    OFF, ALL, ONE
}

data class LyricsLine(val text: String, val timeMs: Long)

val SampleLyrics = listOf(
    LyricsLine("بوی گندم مال من، هرچی که دارم مال تو", 0),
    LyricsLine("یه وجب خاک واسه من، تموم دنیا مال تو", 8000),
    LyricsLine("اهل طاعونی این قبیله‌ی مشرقیم", 16000),
    LyricsLine("تویی این مسافر شیشه‌ای شهر فرنگ", 24000),
    LyricsLine("پوستم از جنس شبه، پوست تو از مخمل سرخ", 32000),
    LyricsLine("رختم از تاوله، تن‌پوش تو از پوست پلنگ", 40000),
    LyricsLine("بوی گندم مال من، هرچی که دارم مال تو", 48000),
    LyricsLine("یه وجب خاک واسه من، تموم دنیا مال تو", 56000)
)

/**
 * Native FullScreen Player.
 * - Dedicated HazeState over background artwork & animated ambient light halos.
 * - 100% ClearGlass uncolored buttons allowing moving halos underneath to refract and glow.
 */
@Composable
fun FullScreenPlayer(
    track: Track,
    isPlaying: Boolean,
    currentTimeSec: Int,
    durationSec: Int,
    onBack: () -> Unit,
    onTogglePlay: () -> Unit,
    onNextTrack: () -> Unit,
    onPreviousTrack: () -> Unit,
    onSeek: (Float) -> Unit,
    modifier: Modifier = Modifier
) {
    val playerHazeState = remember { HazeState() }

    var isLiked by remember { mutableStateOf(false) }
    var showLyrics by remember { mutableStateOf(false) }
    var isShuffle by remember { mutableStateOf(false) }
    var repeatMode by remember { mutableStateOf(RepeatModeState.OFF) }
    var isDraggingSlider by remember { mutableStateOf(false) }
    var dragProgress by remember { mutableFloatStateOf(0f) }

    val dominantColor = track.gradientColors.firstOrNull() ?: Color(0xFFF59E0B)
    val currentRatio = if (isDraggingSlider) {
        dragProgress
    } else {
        if (durationSec > 0) (currentTimeSec.toFloat() / durationSec.toFloat()).coerceIn(0f, 1f) else 0f
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF07080B))
            .pointerInput(Unit) {
                detectVerticalDragGestures { _, dragAmount ->
                    if (dragAmount > 45) {
                        onBack()
                    }
                }
            }
    ) {
        // ── 1. Background Blur Source: Artwork + Drifting Ambient Halos ──
        Box(
            modifier = Modifier
                .fillMaxSize()
                .haze(state = playerHazeState)
        ) {
            // Upper Artwork Area with cinematic bottom fade
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.68f)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            brush = Brush.linearGradient(track.gradientColors)
                        )
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

                // Gradient overlay fading from dark-transparent to pitch-black #07080B
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                0.0f to Color(0x66000000),
                                0.20f to Color.Transparent,
                                0.45f to Color(0x3007080B),
                                0.75f to Color(0xCC07080B),
                                1.0f to Color(0xFF07080B)
                            )
                        )
                )
            }

            // Ambient Floating Light Halos (Drifting across lower region)
            AmbientHalos(
                dominantColor = dominantColor,
                modifier = Modifier.fillMaxSize()
            )
        }

        // ── 2. Foreground Content Column (Clear Liquid Glass Buttons) ──
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Top Bar: Uncolored ClearGlass buttons showing artwork colors underneath
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Collapse circular glass button
                LiquidGlassButton(
                    onClick = onBack,
                    size = 44.dp,
                    icon = Icons.Filled.KeyboardArrowDown,
                    iconSize = 24.dp,
                    hazeState = playerHazeState,
                    variant = LiquidGlassVariant.ClearGlass,
                    tint = Color.White,
                    contentDescription = "Collapse"
                )

                // NOW PLAYING / LYRICS title
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = if (showLyrics) "LYRICS" else "NOW PLAYING",
                        fontFamily = AudexFontFamily,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFA1A1A6),
                        letterSpacing = 2.sp
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "Original Track",
                        fontFamily = AudexFontFamily,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.White.copy(alpha = 0.9f)
                    )
                }

                // Options circular glass button
                LiquidGlassButton(
                    onClick = { /* options */ },
                    size = 44.dp,
                    icon = Icons.Filled.MoreVert,
                    iconSize = 20.dp,
                    hazeState = playerHazeState,
                    variant = LiquidGlassVariant.ClearGlass,
                    tint = Color.White,
                    contentDescription = "Options"
                )
            }

            // Center Area: Lyrics or Tappable clear stage
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = { showLyrics = !showLyrics }
                    ),
                contentAlignment = Alignment.Center
            ) {
                this@Column.AnimatedVisibility(
                    visible = showLyrics,
                    enter = fadeIn(),
                    exit = fadeOut()
                ) {
                    LiquidGlassSurface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .fillMaxHeight(0.75f),
                        shape = RoundedCornerShape(24.dp),
                        variant = LiquidGlassVariant.ClearGlass,
                        hazeState = playerHazeState
                    ) {
                        val listState = rememberLazyListState()
                        LazyColumn(
                            state = listState,
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(20.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            itemsIndexed(SampleLyrics) { index, line ->
                                val isCurrent = index == 1 // sample highlight
                                Text(
                                    text = line.text,
                                    fontSize = if (isCurrent) 20.sp else 16.sp,
                                    fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal,
                                    color = if (isCurrent) Color.White else Color(0xFF71717A),
                                    textAlign = TextAlign.Center
                                )
                            }
                        }
                    }
                }
            }

            // Bottom Controls Area
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp)
            ) {
                // Title, Artist, Heart & Quote buttons
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Bottom
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = track.title,
                            fontFamily = AudexFontFamily,
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Spacer(modifier = Modifier.height(3.dp))
                        Text(
                            text = track.artist,
                            fontFamily = AudexFontFamily,
                            fontSize = 15.sp,
                            color = Color(0xFF999999),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        // Like Button (ClearGlass)
                        LiquidGlassButton(
                            onClick = { isLiked = !isLiked },
                            size = 44.dp,
                            icon = if (isLiked) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                            tint = if (isLiked) Color(0xFFF43F5E) else Color.White,
                            hazeState = playerHazeState,
                            variant = LiquidGlassVariant.ClearGlass,
                            contentDescription = "Like"
                        )

                        // Lyrics Toggle Button (ClearGlass)
                        LiquidGlassButton(
                            onClick = { showLyrics = !showLyrics },
                            size = 44.dp,
                            icon = Icons.Filled.ChatBubbleOutline,
                            tint = if (showLyrics) Color(0xFFF59E0B) else Color.White,
                            hazeState = playerHazeState,
                            variant = LiquidGlassVariant.ClearGlass,
                            contentDescription = "Lyrics"
                        )
                    }
                }

                // ── Scrubber Slider (Custom Liquid Glow Scrubber) ──
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(32.dp)
                        .pointerInput(Unit) {
                            detectHorizontalDragGestures(
                                onDragStart = { offset ->
                                    isDraggingSlider = true
                                    dragProgress = (offset.x / size.width.toFloat()).coerceIn(0f, 1f)
                                },
                                onDragEnd = {
                                    isDraggingSlider = false
                                    onSeek(dragProgress)
                                },
                                onDragCancel = {
                                    isDraggingSlider = false
                                },
                                onHorizontalDrag = { _, dragAmount ->
                                    val newProg = (dragProgress + dragAmount / size.width.toFloat()).coerceIn(0f, 1f)
                                    dragProgress = newProg
                                    onSeek(newProg)
                                }
                            )
                        },
                    contentAlignment = Alignment.CenterStart
                ) {
                    // Rail background
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.15f))
                    ) {
                        // Played liquid track
                        Box(
                            modifier = Modifier
                                .fillMaxHeight()
                                .fillMaxWidth(fraction = currentRatio)
                                .clip(CircleShape)
                                .background(
                                    brush = Brush.horizontalGradient(
                                        colors = listOf(
                                            Color(0xFFEA580C),
                                            Color(0xFFF59E0B),
                                            Color(0xFFFBBF24)
                                        )
                                    )
                                )
                        )
                    }

                    // Glowing amber thumb
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(fraction = currentRatio)
                    ) {
                        Box(
                            modifier = Modifier
                                .align(Alignment.CenterEnd)
                                .size(18.dp)
                                .shadow(
                                    elevation = 8.dp,
                                    shape = CircleShape,
                                    spotColor = Color(0xFFF59E0B)
                                )
                                .background(Color(0xFFF59E0B), CircleShape)
                                .border(
                                    width = 2.5.dp,
                                    color = Color.White,
                                    shape = CircleShape
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(4.dp)
                                    .background(Color.White, CircleShape)
                            )
                        }
                    }
                }

                // Time indicators: 0:00 and remaining -4:57
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    val curSec = if (isDraggingSlider) (dragProgress * durationSec).toInt() else currentTimeSec
                    val remSec = (durationSec - curSec).coerceAtLeast(0)

                    Text(
                        text = "%d:%02d".format(curSec / 60, curSec % 60),
                        fontSize = 12.sp,
                        fontFamily = AudexFontFamily,
                        color = Color(0xFFA1A1A6)
                    )
                    Text(
                        text = "-%d:%02d".format(remSec / 60, remSec % 60),
                        fontSize = 12.sp,
                        fontFamily = AudexFontFamily,
                        color = Color(0xFFA1A1A6)
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                // ── Primary Playback Row: Prev, ClearGlass Play Pill, Next ──
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Previous Track (Circular ClearGlass 56dp)
                    LiquidGlassButton(
                        onClick = onPreviousTrack,
                        size = 56.dp,
                        icon = Icons.Filled.SkipPrevious,
                        iconSize = 28.dp,
                        hazeState = playerHazeState,
                        variant = LiquidGlassVariant.ClearGlass,
                        tint = Color.White,
                        contentDescription = "Previous"
                    )

                    // Main Play/Pause Capsule Pill (ClearGlass - Halos shine through!)
                    LiquidGlassSurface(
                        modifier = Modifier
                            .weight(1f)
                            .height(56.dp)
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null,
                                onClick = onTogglePlay
                            ),
                        hazeState = playerHazeState,
                        shape = CircleShape,
                        variant = LiquidGlassVariant.ClearGlass,
                        borderWidth = 1.dp,
                        showTopHighlight = true
                    ) {
                        Row(
                            modifier = Modifier.fillMaxSize(),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                                contentDescription = if (isPlaying) "Pause" else "Play",
                                tint = Color.White,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = if (isPlaying) "Pause" else "Play",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color.White,
                                letterSpacing = 0.5.sp
                            )
                        }
                    }

                    // Next Track (Circular ClearGlass 56dp)
                    LiquidGlassButton(
                        onClick = onNextTrack,
                        size = 56.dp,
                        icon = Icons.Filled.SkipNext,
                        iconSize = 28.dp,
                        hazeState = playerHazeState,
                        variant = LiquidGlassVariant.ClearGlass,
                        tint = Color.White,
                        contentDescription = "Next"
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // ── Secondary Controls Row: Shuffle, Audio, Repeat (All ClearGlass) ──
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Shuffle (ClearGlass)
                    LiquidGlassSurface(
                        modifier = Modifier
                            .weight(1f)
                            .height(44.dp)
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null,
                                onClick = { isShuffle = !isShuffle }
                            ),
                        hazeState = playerHazeState,
                        shape = CircleShape,
                        variant = LiquidGlassVariant.ClearGlass
                    ) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Filled.Shuffle,
                                contentDescription = "Shuffle",
                                tint = if (isShuffle) Color(0xFFF59E0B) else Color.White.copy(alpha = 0.9f),
                                modifier = Modifier.size(19.dp)
                            )
                        }
                    }

                    // Audio Mode (ClearGlass)
                    LiquidGlassSurface(
                        modifier = Modifier
                            .weight(1.3f)
                            .height(44.dp)
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null,
                                onClick = { /* audio mode */ }
                            ),
                        hazeState = playerHazeState,
                        shape = CircleShape,
                        variant = LiquidGlassVariant.ClearGlass
                    ) {
                        Row(
                            modifier = Modifier.fillMaxSize(),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Filled.Headphones,
                                contentDescription = "Audio Output",
                                tint = Color.White.copy(alpha = 0.9f),
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "AUDIO",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White.copy(alpha = 0.9f),
                                letterSpacing = 1.sp
                            )
                        }
                    }

                    // Repeat Cycle (ClearGlass)
                    LiquidGlassSurface(
                        modifier = Modifier
                            .weight(1f)
                            .height(44.dp)
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null,
                                onClick = {
                                    repeatMode = when (repeatMode) {
                                        RepeatModeState.OFF -> RepeatModeState.ALL
                                        RepeatModeState.ALL -> RepeatModeState.ONE
                                        RepeatModeState.ONE -> RepeatModeState.OFF
                                    }
                                }
                            ),
                        hazeState = playerHazeState,
                        shape = CircleShape,
                        variant = LiquidGlassVariant.ClearGlass
                    ) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = when (repeatMode) {
                                    RepeatModeState.ONE -> Icons.Filled.RepeatOne
                                    else -> Icons.Filled.Repeat
                                },
                                contentDescription = "Repeat",
                                tint = if (repeatMode != RepeatModeState.OFF) Color(0xFFF59E0B) else Color.White.copy(alpha = 0.9f),
                                modifier = Modifier.size(19.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
