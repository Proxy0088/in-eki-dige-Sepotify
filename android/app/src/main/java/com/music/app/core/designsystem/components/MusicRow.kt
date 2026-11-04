package com.music.app.core.designsystem.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.outlined.Download
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.music.app.core.model.Track

@Composable
fun MusicRow(
    track: Track,
    isPlaying: Boolean,
    isCurrent: Boolean,
    onPlay: (Track) -> Unit,
    onToggleLike: ((Track) -> Unit)? = null,
    onToggleDownload: ((Track) -> Unit)? = null,
    onMoreClick: ((Track) -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val activePlaying = isCurrent && isPlaying

    val rowShape = RoundedCornerShape(16.dp)
    val rowBackground = if (isCurrent) {
        Color.White.copy(alpha = 0.08f)
    } else {
        Color(0xFF14161F).copy(alpha = 0.85f)
    }
    val rowBorder = if (isCurrent) {
        Modifier.border(1.dp, Color(0xFF22D3EE).copy(alpha = 0.35f), rowShape)
    } else {
        Modifier.border(1.dp, Color.White.copy(alpha = 0.06f), rowShape)
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(64.dp)
            .clip(rowShape)
            .background(rowBackground)
            .then(rowBorder)
            .clickable { onPlay(track) }
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        // Left side: Artwork & metadata
        Row(
            modifier = Modifier
                .weight(1f)
                .padding(end = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Squircle Artwork Container (44 x 44 dp)
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(
                        brush = Brush.linearGradient(track.gradientColors)
                    ),
                contentAlignment = Alignment.Center
            ) {
                var hasValidImage by remember(track.id) { mutableStateOf(false) }

                if (!track.coverUrl.isNullOrEmpty()) {
                    AsyncImage(
                        model = track.coverUrl,
                        contentDescription = track.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                        onSuccess = { hasValidImage = true },
                        onError = { hasValidImage = false }
                    )
                }

                if (!hasValidImage) {
                    Icon(
                        imageVector = Icons.Default.MusicNote,
                        contentDescription = null,
                        tint = Color.White.copy(alpha = 0.9f),
                        modifier = Modifier.size(20.dp)
                    )
                }

                // Playing indicator / Pause icon over artwork
                if (activePlaying) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.5f)),
                        contentAlignment = Alignment.Center
                    ) {
                        AnimatedEqualizerBars()
                    }
                } else if (isCurrent) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.5f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Pause,
                            contentDescription = "Paused",
                            tint = Color.White,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Title & Artist & National Net Badge
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.Center
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = track.title,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        color = if (isCurrent) Color(0xFF00E5FF) else Color(0xFFEDEDED),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false)
                    )

                    if (track.isNationalNet) {
                        Box(
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(Color(0xFF064E3B).copy(alpha = 0.8f))
                                .border(0.5.dp, Color(0xFF10B981).copy(alpha = 0.4f), CircleShape)
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = "National Net",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF34D399)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(2.dp))

                Text(
                    text = track.artist,
                    fontSize = 12.sp,
                    color = Color(0xFFA1A1A6),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }

        // Right side: Duration, Like, Download, More
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = track.durationFormatted,
                fontSize = 12.sp,
                fontFamily = FontFamily.Monospace,
                color = Color(0xFF71717A),
                modifier = Modifier.padding(end = 4.dp)
            )

            if (onToggleLike != null) {
                IconButton(
                    onClick = { onToggleLike(track) },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        imageVector = if (track.isLiked) Icons.Default.Favorite else Icons.Outlined.FavoriteBorder,
                        contentDescription = "Like",
                        tint = if (track.isLiked) Color(0xFFFB7185) else Color(0xFF71717A),
                        modifier = Modifier.size(16.dp)
                    )
                }
            }

            if (onToggleDownload != null) {
                IconButton(
                    onClick = { onToggleDownload(track) },
                    modifier = Modifier.size(32.dp)
                ) {
                    if (track.isDownloaded) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = "Downloaded",
                            tint = Color(0xFF34D399),
                            modifier = Modifier.size(16.dp)
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Outlined.Download,
                            contentDescription = "Download",
                            tint = Color(0xFF71717A),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }

            if (onMoreClick != null) {
                IconButton(
                    onClick = { onMoreClick(track) },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.MoreVert,
                        contentDescription = "More",
                        tint = Color(0xFF71717A),
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}

/**
 * High-performance Canvas Equalizer Bars.
 * Runs strictly in Compose draw phase - ZERO re-measurement, ZERO re-layout, 120 FPS smooth.
 */
@Composable
fun AnimatedEqualizerBars(modifier: Modifier = Modifier) {
    val infiniteTransition = rememberInfiniteTransition(label = "row_equalizer")

    val h1 by infiniteTransition.animateFloat(
        initialValue = 0.25f,
        targetValue = 0.85f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 400, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "eq_bar1"
    )

    val h2 by infiniteTransition.animateFloat(
        initialValue = 0.85f,
        targetValue = 0.35f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 550, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "eq_bar2"
    )

    val h3 by infiniteTransition.animateFloat(
        initialValue = 0.45f,
        targetValue = 0.95f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 480, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "eq_bar3"
    )

    Canvas(
        modifier = modifier.size(width = 15.dp, height = 14.dp)
    ) {
        val barW = 2.5.dp.toPx()
        val corner = CornerRadius(barW / 2f, barW / 2f)
        val maxH = size.height
        val color = Color(0xFF22D3EE)
        val spacing = 2.dp.toPx()

        // Bar 1
        val h1Px = maxH * h1
        drawRoundRect(
            color = color,
            topLeft = Offset(0f, maxH - h1Px),
            size = Size(barW, h1Px),
            cornerRadius = corner
        )

        // Bar 2
        val h2Px = maxH * h2
        drawRoundRect(
            color = color,
            topLeft = Offset(barW + spacing, maxH - h2Px),
            size = Size(barW, h2Px),
            cornerRadius = corner
        )

        // Bar 3
        val h3Px = maxH * h3
        drawRoundRect(
            color = color,
            topLeft = Offset((barW + spacing) * 2f, maxH - h3Px),
            size = Size(barW, h3Px),
            cornerRadius = corner
        )
    }
}
