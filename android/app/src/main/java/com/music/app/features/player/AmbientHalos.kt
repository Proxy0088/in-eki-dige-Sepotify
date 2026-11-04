package com.music.app.features.player

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import kotlin.math.cos
import kotlin.math.sin

/**
 * Ambient Glowing Light Halos.
 * - 3 organic halos driven by track dominant color
 * - Positioned in the lower half of the screen starting from artwork fade-out line
 * - Smooth continuous floating/drifting motion using infinite sinusoidal physics
 * - Subtle, soft glow (non-harsh)
 */
@Composable
fun AmbientHalos(
    dominantColor: Color,
    modifier: Modifier = Modifier,
    haloIntensity: Float = 0.45f
) {
    val infiniteTransition = rememberInfiniteTransition(label = "ambient_halos")

    // Slow sinusoidal phase 1 (8 seconds cycle)
    val phase1 by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 2f * Math.PI.toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 8000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "phase1"
    )

    // Phase 2 (11 seconds cycle)
    val phase2 by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 2f * Math.PI.toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 11000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "phase2"
    )

    // Phase 3 (9.5 seconds cycle)
    val phase3 by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 2f * Math.PI.toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 9500, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "phase3"
    )

    Canvas(modifier = modifier.fillMaxSize()) {
        val w = size.width
        val h = size.height

        // Halos live in the lower region starting at artwork fade line (~48% height)
        val topBound = h * 0.46f
        val bottomBound = h * 0.92f
        val centerY = (topBound + bottomBound) / 2f

        // Halo 1: Left-center floating orb
        val x1 = w * 0.30f + (w * 0.14f) * sin(phase1)
        val y1 = centerY + (h * 0.12f) * cos(phase1)
        val r1 = (w * 0.55f) * (1f + 0.08f * sin(phase1 * 1.5f))
        val a1 = haloIntensity * (1f + 0.12f * cos(phase1))

        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(
                    dominantColor.copy(alpha = (a1 * 0.38f).coerceIn(0f, 1f)),
                    dominantColor.copy(alpha = (a1 * 0.16f).coerceIn(0f, 1f)),
                    dominantColor.copy(alpha = (a1 * 0.04f).coerceIn(0f, 1f)),
                    Color.Transparent
                ),
                center = Offset(x1, y1),
                radius = r1
            ),
            radius = r1,
            center = Offset(x1, y1)
        )

        // Halo 2: Right-center floating orb
        val x2 = w * 0.72f + (w * 0.15f) * cos(phase2)
        val y2 = (centerY + h * 0.06f) + (h * 0.10f) * sin(phase2)
        val r2 = (w * 0.60f) * (1f + 0.06f * cos(phase2 * 1.3f))
        val a2 = haloIntensity * (1f + 0.10f * sin(phase2))

        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(
                    dominantColor.copy(alpha = (a2 * 0.34f).coerceIn(0f, 1f)),
                    dominantColor.copy(alpha = (a2 * 0.14f).coerceIn(0f, 1f)),
                    dominantColor.copy(alpha = (a2 * 0.03f).coerceIn(0f, 1f)),
                    Color.Transparent
                ),
                center = Offset(x2, y2),
                radius = r2
            ),
            radius = r2,
            center = Offset(x2, y2)
        )

        // Halo 3: Subtle center-bottom warmth accent
        val x3 = w * 0.50f + (w * 0.10f) * sin(phase3 * 0.8f)
        val y3 = (bottomBound - h * 0.08f) + (h * 0.06f) * cos(phase3)
        val r3 = (w * 0.48f) * (1f + 0.07f * sin(phase3))
        val a3 = haloIntensity * 0.80f * (1f + 0.10f * cos(phase3))

        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(
                    Color.White.copy(alpha = (a3 * 0.20f).coerceIn(0f, 1f)),
                    dominantColor.copy(alpha = (a3 * 0.15f).coerceIn(0f, 1f)),
                    Color.Transparent
                ),
                center = Offset(x3, y3),
                radius = r3
            ),
            radius = r3,
            center = Offset(x3, y3)
        )
    }
}
