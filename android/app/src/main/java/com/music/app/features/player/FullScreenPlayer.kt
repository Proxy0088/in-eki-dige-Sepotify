package com.music.app.features.player

import android.graphics.drawable.BitmapDrawable
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
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
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.palette.graphics.Palette
import coil.compose.AsyncImage
import coil.imageLoader
import coil.request.ImageRequest
import coil.request.SuccessResult
import com.music.app.core.designsystem.components.LiquidGlassButton
import com.music.app.core.designsystem.components.LiquidGlassSurface
import com.music.app.core.designsystem.components.LiquidGlassVariant
import com.music.app.core.designsystem.theme.AudexFontFamily
import com.music.app.core.model.Track
import com.music.app.core.network.LyricsService
import com.music.app.core.network.TrackLyrics
import dev.chrisbanes.haze.HazeState
import dev.chrisbanes.haze.haze
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

enum class RepeatModeState {
    OFF, ALL, ONE
}

data class LyricsLine(val text: String, val timeMs: Long)

fun getActiveLyricColor(dominant: Color, secondary: Color): Color {
    val src = if (secondary != Color.Unspecified && secondary.alpha > 0f) secondary else dominant
    val r = src.red
    val g = src.green
    val b = src.blue
    val max = maxOf(r, g, b)
    val min = minOf(r, g, b)
    val delta = max - min
    val l = (max + min) / 2f
    val s = if (delta == 0f) 0f else delta / (1f - kotlin.math.abs(2f * l - 1f))
    var h = when {
        delta == 0f -> 0f
        max == r -> 60f * (((g - b) / delta) % 6f)
        max == g -> 60f * (((b - r) / delta) + 2f)
        else -> 60f * (((r - g) / delta) + 4f)
    }
    if (h < 0f) h += 360f

    // If artwork is monochromatic (black/white/gray), use bright warm amber
    if (s < 0.16f) return Color(0xFFFBBF24)

    // Preserve the cover's signature hue with high saturation and bright luminosity for glow
    return Color.hsl(h, 0.92f, 0.72f)
}

val SampleLyrics = listOf(
    LyricsLine("Walking through the glowing lights at night", 0),
    LyricsLine("Listening to the rhythm of the city sounds", 8000),
    LyricsLine("Feel the bass vibrating through the ground", 16000),
    LyricsLine("Lost inside the melody we found", 24000),
    LyricsLine("Stars are shining bright above the sky", 32000),
    LyricsLine("Every second passing slowly by", 40000),
    LyricsLine("Walking through the glowing lights at night", 48000),
    LyricsLine("Listening to the rhythm of the city sounds", 56000)
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
    onSeekToMs: ((Long) -> Unit)? = null,
    onAddToPlaylist: ((Track) -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val playerHazeState = remember { HazeState() }

    val context = LocalContext.current

    var isLiked by remember(track.id, track.isLiked) { mutableStateOf(track.isLiked) }
    var showLyrics by remember { mutableStateOf(false) }
    var isShuffle by remember { mutableStateOf(false) }
    var repeatMode by remember { mutableStateOf(RepeatModeState.OFF) }
    var isDraggingSlider by remember { mutableStateOf(false) }
    var dragProgress by remember { mutableFloatStateOf(0f) }

    var realLyrics by remember(track.id) { mutableStateOf<TrackLyrics?>(null) }
    var isLoadingLyrics by remember(track.id) { mutableStateOf(false) }

    LaunchedEffect(track.id, showLyrics) {
        if (showLyrics && realLyrics == null) {
            isLoadingLyrics = true
            realLyrics = LyricsService.getLyrics(track.artist, track.title, durationSec)
            isLoadingLyrics = false
        }
    }

    // Dynamic Artwork Palette Colors (smoothly transition when songs change)
    val fallbackHue = (track.title.hashCode() and 0xFFFF) % 360f
    var dynamicDominant by remember(track.id) { mutableStateOf(Color.hsl(fallbackHue, 0.70f, 0.45f)) }
    var dynamicSecondary by remember(track.id) { mutableStateOf(Color.hsl((fallbackHue + 60f) % 360f, 0.85f, 0.55f)) }

    LaunchedEffect(track.id, track.coverUrl) {
        val cover = track.coverUrl
        if (!cover.isNullOrEmpty()) {
            try {
                val loader = context.imageLoader
                val request = ImageRequest.Builder(context)
                    .data(cover)
                    .allowHardware(false)
                    .size(120, 120)
                    .build()
                val result = (loader.execute(request) as? SuccessResult)?.drawable
                val bitmap = (result as? BitmapDrawable)?.bitmap
                if (bitmap != null) {
                    val palette = withContext(Dispatchers.Default) {
                        Palette.from(bitmap).generate()
                    }
                    val dominant = palette.dominantSwatch?.rgb
                        ?: palette.vibrantSwatch?.rgb
                        ?: palette.mutedSwatch?.rgb
                    val secondary = palette.vibrantSwatch?.rgb
                        ?: palette.lightVibrantSwatch?.rgb
                        ?: palette.darkVibrantSwatch?.rgb
                        ?: palette.dominantSwatch?.rgb

                    if (dominant != null) {
                        dynamicDominant = Color(dominant)
                    }
                    if (secondary != null) {
                        dynamicSecondary = Color(secondary)
                    }
                }
            } catch (_: Exception) {}
        }
    }

    val animatedDominant by animateColorAsState(
        targetValue = dynamicDominant,
        animationSpec = tween(durationMillis = 750),
        label = "dominant_color"
    )
    val animatedSecondary by animateColorAsState(
        targetValue = dynamicSecondary,
        animationSpec = tween(durationMillis = 750),
        label = "secondary_color"
    )

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
                            brush = Brush.linearGradient(listOf(animatedDominant, animatedSecondary, Color(0xFF07080B)))
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

            // Ambient Floating Light Halos (Drifting across lower region with dynamic cover colors)
            AmbientHalos(
                dominantColor = animatedDominant,
                secondaryColor = animatedSecondary,
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
                    val activeGlowColor = remember(animatedDominant, animatedSecondary) {
                        getActiveLyricColor(animatedDominant, animatedSecondary)
                    }

                    LiquidGlassSurface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .fillMaxHeight(0.75f),
                        shape = RoundedCornerShape(26.dp),
                        variant = LiquidGlassVariant.Card,
                        blurRadius = 25.dp,
                        customBaseColor = Color(0xDE0B0E17),
                        borderWidth = 1.dp,
                        hazeState = playerHazeState
                    ) {
                        val listState = rememberLazyListState()
                        val lyricLines = realLyrics?.lines ?: emptyList()
                        val curMs = currentTimeSec * 1000L

                        val activeIdx = remember(curMs, lyricLines) {
                            if (lyricLines.isEmpty()) -1
                            else {
                                var found = -1
                                for (i in lyricLines.indices.reversed()) {
                                    if (curMs >= lyricLines[i].timeMs) {
                                        found = i
                                        break
                                    }
                                }
                                if (found == -1 && lyricLines.isNotEmpty()) 0 else found
                            }
                        }

                        LaunchedEffect(activeIdx) {
                            if (activeIdx >= 0 && activeIdx < lyricLines.size) {
                                val target = (activeIdx - 2).coerceAtLeast(0)
                                listState.animateScrollToItem(target)
                            }
                        }

                        if (isLoadingLyrics) {
                            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(28.dp),
                                    color = activeGlowColor,
                                    strokeWidth = 2.5.dp
                                )
                            }
                        } else if (lyricLines.isEmpty()) {
                            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Text(
                                    text = "No lyrics available for this song",
                                    fontFamily = AudexFontFamily,
                                    fontSize = 14.sp,
                                    color = Color(0xFFA1A1A6),
                                    textAlign = TextAlign.Center
                                )
                            }
                        } else {
                            LazyColumn(
                                state = listState,
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(20.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(16.dp)
                            ) {
                                itemsIndexed(lyricLines) { index, line ->
                                    val isCurrent = index == activeIdx
                                    Text(
                                        text = line.text,
                                        fontFamily = AudexFontFamily,
                                        fontSize = if (isCurrent) 21.sp else 16.sp,
                                        fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal,
                                        color = if (isCurrent) activeGlowColor else Color(0xFF9CA3AF).copy(alpha = 0.60f),
                                        textAlign = TextAlign.Center,
                                        letterSpacing = if (isCurrent) 0.2.sp else 0.sp,
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(8.dp))
                                            .clickable {
                                                if (onSeekToMs != null) {
                                                    onSeekToMs(line.timeMs)
                                                } else {
                                                    val safeDurationMs = durationSec.coerceAtLeast(1) * 1000f
                                                    onSeek((line.timeMs / safeDurationMs).coerceIn(0f, 0.999f))
                                                }
                                            }
                                            .padding(vertical = 4.dp, horizontal = 8.dp)
                                    )
                                }
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
                        // Like / Add to Playlist Button (ClearGlass)
                        LiquidGlassButton(
                            onClick = {
                                if (onAddToPlaylist != null) {
                                    onAddToPlaylist(track)
                                } else {
                                    isLiked = !isLiked
                                }
                            },
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
                    ClearGlassPillButton(
                        onClick = onTogglePlay,
                        hazeState = playerHazeState,
                        modifier = Modifier
                            .weight(1f)
                            .height(56.dp),
                        pressedScale = 0.93f
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
                    ClearGlassPillButton(
                        onClick = { isShuffle = !isShuffle },
                        hazeState = playerHazeState,
                        modifier = Modifier
                            .weight(1f)
                            .height(44.dp)
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
                    ClearGlassPillButton(
                        onClick = { /* audio mode */ },
                        hazeState = playerHazeState,
                        modifier = Modifier
                            .weight(1.3f)
                            .height(44.dp)
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
                    ClearGlassPillButton(
                        onClick = {
                            repeatMode = when (repeatMode) {
                                RepeatModeState.OFF -> RepeatModeState.ALL
                                RepeatModeState.ALL -> RepeatModeState.ONE
                                RepeatModeState.ONE -> RepeatModeState.OFF
                            }
                        },
                        hazeState = playerHazeState,
                        modifier = Modifier
                            .weight(1f)
                            .height(44.dp)
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

/**
 * Capsule ClearGlass button with the same tactile spring press bounce as [LiquidGlassButton].
 */
@Composable
private fun ClearGlassPillButton(
    onClick: () -> Unit,
    hazeState: HazeState,
    modifier: Modifier = Modifier,
    pressedScale: Float = 0.91f,
    showTopHighlight: Boolean = true,
    content: @Composable BoxScope.() -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) pressedScale else 1f,
        animationSpec = spring(stiffness = Spring.StiffnessMedium, dampingRatio = 0.65f),
        label = "pill_btn_scale"
    )

    LiquidGlassSurface(
        modifier = modifier
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onClick
            ),
        hazeState = hazeState,
        shape = CircleShape,
        variant = LiquidGlassVariant.ClearGlass,
        borderWidth = 1.dp,
        showTopHighlight = showTopHighlight,
        content = content
    )
}
