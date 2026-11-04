package com.music.app.features.player

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.music.app.DummyTrack
import com.music.app.core.designsystem.components.LiquidGlassSurface
import com.music.app.core.designsystem.components.LiquidGlassVariant
import dev.chrisbanes.haze.HazeState

/**
 * Native Mini Player Widget matching reference-web/src/components/WhenPlayingWidget.tsx
 * - Docked capsule directly above BottomNav
 * - Track squircle artwork with animated equalizer bars
 * - Native Liquid Glass material with bottom progress indicator
 */
@Composable
fun WhenPlayingWidget(
    currentTrack: DummyTrack?,
    isPlaying: Boolean,
    progress: Float, // 0.0f to 1.0f
    onTogglePlay: () -> Unit,
    onNextTrack: () -> Unit,
    onOpenPlayer: () -> Unit,
    modifier: Modifier = Modifier,
    hazeState: HazeState? = null
) {
    AnimatedVisibility(
        visible = currentTrack != null,
        enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
        exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
        modifier = modifier
    ) {
        if (currentTrack == null) return@AnimatedVisibility

        val interactionSource = remember { MutableInteractionSource() }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp)
        ) {
            LiquidGlassSurface(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(60.dp)
                    .clickable(
                        interactionSource = interactionSource,
                        indication = null,
                        onClick = onOpenPlayer
                    ),
                hazeState = hazeState,
                shape = CircleShape,
                variant = LiquidGlassVariant.Dock,
                showTopHighlight = true
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(start = 8.dp, end = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Track Artwork Squircle with equalizer
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(
                                brush = Brush.linearGradient(currentTrack.gradientColors)
                            ),
                        contentAlignment = Alignment.BottomCenter
                    ) {
                        if (isPlaying) {
                            AnimatedEqualizerBars(
                                modifier = Modifier.padding(bottom = 6.dp)
                            )
                        }
                    }

                    // Track Title & Artist
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .padding(horizontal = 12.dp),
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = currentTrack.title,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFFEDEDED),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            letterSpacing = (-0.2).sp
                        )
                        Text(
                            text = currentTrack.artist,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Normal,
                            color = Color(0xFFA1A1A6),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    // Action Controls: Play/Pause & Next
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Play/Pause Button
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFEDEDED))
                                .clickable { onTogglePlay() },
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                                contentDescription = if (isPlaying) "Pause" else "Play",
                                tint = Color(0xFF090A0F),
                                modifier = Modifier.size(18.dp)
                            )
                        }

                        // Next Track Button
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.08f))
                                .clickable { onNextTrack() },
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Filled.SkipNext,
                                contentDescription = "Next Track",
                                tint = Color(0xFFEDEDED),
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }

                // Mini Progress Line along bottom edge
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .padding(horizontal = 18.dp)
                        .height(2.dp)
                        .clip(RoundedCornerShape(1.dp))
                        .background(Color.White.copy(alpha = 0.12f))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(fraction = progress.coerceIn(0f, 1f))
                            .background(Color(0xFF22D3EE))
                    )
                }
            }
        }
    }
}

/**
 * 3 rhythmic cyan equalizer bars matching reference-web
 */
@Composable
private fun AnimatedEqualizerBars(modifier: Modifier = Modifier) {
    val infiniteTransition = rememberInfiniteTransition(label = "equalizer")

    val bar1Height by infiniteTransition.animateFloat(
        initialValue = 4f,
        targetValue = 12f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 400),
            repeatMode = RepeatMode.Reverse
        ),
        label = "bar1"
    )

    val bar2Height by infiniteTransition.animateFloat(
        initialValue = 12f,
        targetValue = 6f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 550),
            repeatMode = RepeatMode.Reverse
        ),
        label = "bar2"
    )

    val bar3Height by infiniteTransition.animateFloat(
        initialValue = 6f,
        targetValue = 14f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 450),
            repeatMode = RepeatMode.Reverse
        ),
        label = "bar3"
    )

    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(2.dp),
        verticalAlignment = Alignment.Bottom
    ) {
        Box(
            modifier = Modifier
                .size(width = 2.dp, height = bar1Height.dp)
                .background(Color(0xFF22D3EE), CircleShape)
        )
        Box(
            modifier = Modifier
                .size(width = 2.dp, height = bar2Height.dp)
                .background(Color(0xFF22D3EE), CircleShape)
        )
        Box(
            modifier = Modifier
                .size(width = 2.dp, height = bar3Height.dp)
                .background(Color(0xFF22D3EE), CircleShape)
        )
    }
}
