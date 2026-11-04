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
 * - 3 organic halos dynamically driven by track artwork dominant and vibrant colors
 * - Positioned in the lower half of the screen starting from artwork fade-out line
 * - Smooth continuous floating/drifting motion using infinite sinusoidal physics
 * - High performance Canvas draw phase (zero recompositions, 120 FPS)
 */
@Composable
fun AmbientHalos(
    dominantColor: Color,
    secondaryColor: Color = dominantColor,
    modifier: Modifier = Modifier,
    haloIntensity: Float = 0.50f
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

        // Halos live in the lower region starting at artwork fade line (~46% height)
        val topBound = h * 0.44f
        val bottomBound = h * 0.94f
        val centerY = (topBound + bottomBound) / 2f

        // Halo 1: Left-center floating orb (Dominant Color from cover)
        val x1 = w * 0.28f + (w * 0.14f) * sin(phase1)
        val y1 = centerY + (h * 0.12f) * cos(phase1)
        val r1 = (w * 0.58f) * (1f + 0.08f * sin(phase1 * 1.5f))
        val a1 = haloIntensity * (1f + 0.12f * cos(phase1))

        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(
                    dominantColor.copy(alpha = (a1 * 0.42f).coerceIn(0f, 1f)),
                    dominantColor.copy(alpha = (a1 * 0.18f).coerceIn(0f, 1f)),
                    dominantColor.copy(alpha = (a1 * 0.04f).coerceIn(0f, 1f)),
                    Color.Transparent
                ),
                center = Offset(x1, y1),
                radius = r1
            ),
            radius = r1,
            center = Offset(x1, y1)
        )

        // Halo 2: Right-center floating orb (Secondary Vibrant Color from cover)
        val x2 = w * 0.74f + (w * 0.15f) * cos(phase2)
        val y2 = (centerY + h * 0.05f) + (h * 0.10f) * sin(phase2)
        val r2 = (w * 0.62f) * (1f + 0.06f * cos(phase2 * 1.3f))
        val a2 = haloIntensity * (1f + 0.10f * sin(phase2))

        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(
                    secondaryColor.copy(alpha = (a2 * 0.38f).coerceIn(0f, 1f)),
                    secondaryColor.copy(alpha = (a2 * 0.16f).coerceIn(0f, 1f)),
                    secondaryColor.copy(alpha = (a2 * 0.03f).coerceIn(0f, 1f)),
                    Color.Transparent
                ),
                center = Offset(x2, y2),
                radius = r2
            ),
            radius = r2,
            center = Offset(x2, y2)
        )

        // Halo 3: Subtle center-bottom warmth accent (Blended spectrum)
        val x3 = w * 0.50f + (w * 0.10f) * sin(phase3 * 0.8f)
        val y3 = (bottomBound - h * 0.08f) + (h * 0.06f) * cos(phase3)
        val r3 = (w * 0.50f) * (1f + 0.07f * sin(phase3))
        val a3 = haloIntensity * 0.85f * (1f + 0.10f * cos(phase3))

        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(
                    Color.White.copy(alpha = (a3 * 0.22f).coerceIn(0f, 1f)),
                    dominantColor.copy(alpha = (a3 * 0.14f).coerceIn(0f, 1f)),
                    secondaryColor.copy(alpha = (a3 * 0.06f).coerceIn(0f, 1f)),
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
