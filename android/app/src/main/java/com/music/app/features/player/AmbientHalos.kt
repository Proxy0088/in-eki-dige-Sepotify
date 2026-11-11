package com.music.app.features.player

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import kotlin.math.cos
import kotlin.math.sin

/**
 * Ambient Glowing Light Halos.
 * - Multi-frequency continuous organic plasma drift with zero restarts or loop resets
 * - Driven dynamically by track artwork dominant and vibrant accent colors
 * - Ultra smooth 120 FPS frame-based animation
 */
@Composable
fun AmbientHalos(
    dominantColor: Color,
    secondaryColor: Color = dominantColor,
    modifier: Modifier = Modifier,
    haloIntensity: Float = 0.50f
) {
    var timeSec by remember { mutableFloatStateOf(0f) }

    LaunchedEffect(Unit) {
        var lastNanos = 0L
        while (true) {
            withFrameNanos { nowNanos ->
                if (lastNanos != 0L) {
                    val delta = (nowNanos - lastNanos) / 1_000_000_000f
                    // Smooth, continuous time accumulation - never resets to 0
                    timeSec += delta.coerceIn(0f, 0.05f)
                }
                lastNanos = nowNanos
            }
        }
    }

    Canvas(modifier = modifier.fillMaxSize()) {
        val w = size.width
        val h = size.height

        val topBound = h * 0.44f
        val bottomBound = h * 0.94f
        val centerY = (topBound + bottomBound) / 2f
        val t = timeSec

        // Halo 1: Left-center floating orb (Dominant Color from cover)
        // Quasi-periodic motion combining multiple prime frequencies
        val x1 = w * 0.32f + (w * 0.15f) * sin(t * 0.23f) + (w * 0.08f) * cos(t * 0.11f)
        val y1 = centerY + (h * 0.11f) * cos(t * 0.19f) + (h * 0.05f) * sin(t * 0.09f)
        val r1 = (w * 0.60f) * (1f + 0.07f * sin(t * 0.17f) + 0.03f * cos(t * 0.29f))
        val a1 = haloIntensity * (1f + 0.12f * cos(t * 0.13f))

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
        val x2 = w * 0.70f + (w * 0.16f) * cos(t * 0.17f) + (w * 0.07f) * sin(t * 0.27f)
        val y2 = (centerY + h * 0.05f) + (h * 0.10f) * sin(t * 0.21f) + (h * 0.06f) * cos(t * 0.08f)
        val r2 = (w * 0.64f) * (1f + 0.06f * cos(t * 0.15f) + 0.04f * sin(t * 0.31f))
        val a2 = haloIntensity * (1f + 0.11f * sin(t * 0.19f))

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

        // Halo 3: Subtle center-bottom warmth accent (Harmonic spectrum blend)
        val x3 = w * 0.50f + (w * 0.13f) * sin(t * 0.13f) + (w * 0.06f) * cos(t * 0.25f)
        val y3 = (bottomBound - h * 0.08f) + (h * 0.07f) * cos(t * 0.15f) + (h * 0.04f) * sin(t * 0.09f)
        val r3 = (w * 0.52f) * (1f + 0.07f * sin(t * 0.11f) + 0.03f * cos(t * 0.21f))
        val a3 = haloIntensity * 0.85f * (1f + 0.10f * cos(t * 0.14f))

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
