package com.music.app.core.designsystem.components

import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.music.app.core.designsystem.theme.GlassActivePillDark
import com.music.app.core.designsystem.theme.GlassActivePillLight
import com.music.app.core.designsystem.theme.GlassBorderDark
import com.music.app.core.designsystem.theme.GlassBorderLight
import com.music.app.core.designsystem.theme.GlassButtonDark
import com.music.app.core.designsystem.theme.GlassButtonLight
import com.music.app.core.designsystem.theme.GlassDockDark
import com.music.app.core.designsystem.theme.GlassDockLight
import com.music.app.core.designsystem.theme.GlassHighlightDark
import com.music.app.core.designsystem.theme.LocalIsDarkTheme
import dev.chrisbanes.haze.HazeState
import dev.chrisbanes.haze.HazeStyle
import dev.chrisbanes.haze.hazeChild

enum class LiquidGlassVariant {
    Dock,
    Button,
    ActivePill,
    Card
}

/**
 * Universal Native Liquid Glass Surface.
 * Pixel-matched to reference-web/src/index.css tokens.
 *
 * - API 31+ (Android 12+): Hardware accelerated real-time backdrop blur using Haze.
 * - API 24-30: High-opacity fallback frosted gradient glass with zero performance penalty.
 */
@Composable
fun LiquidGlassSurface(
    modifier: Modifier = Modifier,
    hazeState: HazeState? = null,
    shape: Shape = RoundedCornerShape(percent = 50),
    variant: LiquidGlassVariant = LiquidGlassVariant.Dock,
    borderWidth: Dp = 1.dp,
    showTopHighlight: Boolean = true,
    content: @Composable BoxScope.() -> Unit
) {
    val isDark = LocalIsDarkTheme.current
    val isApi31Plus = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S

    // Glass Background Color depending on Variant & Theme
    val baseColor = when (variant) {
        LiquidGlassVariant.Dock -> if (isDark) {
            if (isApi31Plus) GlassDockDark else Color(0xDE1A2030)
        } else {
            if (isApi31Plus) GlassDockLight else Color(0xF2FFFFFF)
        }
        LiquidGlassVariant.Button -> if (isDark) {
            if (isApi31Plus) GlassButtonDark else Color(0xCC161924)
        } else {
            if (isApi31Plus) GlassButtonLight else Color(0xE6E5E7EB)
        }
        LiquidGlassVariant.ActivePill -> if (isDark) GlassActivePillDark else GlassActivePillLight
        LiquidGlassVariant.Card -> if (isDark) {
            if (isApi31Plus) Color(0x8013151D) else Color(0xF513151D)
        } else {
            if (isApi31Plus) Color(0xA6FFFFFF) else Color(0xF8FFFFFF)
        }
    }

    // Border Colors
    val borderColor = if (isDark) GlassBorderDark else GlassBorderLight

    // Top catch-light color
    val highlightColor = if (isDark) GlassHighlightDark else Color(0x80FFFFFF)

    // Shadow setup
    val shadowElevation = when (variant) {
        LiquidGlassVariant.Dock -> 14.dp
        LiquidGlassVariant.Button -> 8.dp
        LiquidGlassVariant.ActivePill -> 4.dp
        LiquidGlassVariant.Card -> 20.dp
    }

    val shadowModifier = if (variant != LiquidGlassVariant.ActivePill) {
        Modifier.shadow(
            elevation = shadowElevation,
            shape = shape,
            spotColor = Color.Black.copy(alpha = if (isDark) 0.40f else 0.12f),
            ambientColor = Color.Transparent
        )
    } else {
        Modifier
    }

    val hazeModifier = if (hazeState != null && isApi31Plus) {
        Modifier.hazeChild(
            state = hazeState,
            style = HazeStyle(
                backgroundColor = if (isDark) Color(0xFF07080B) else Color(0xFFF8F9FA),
                tint = null,
                blurRadius = 24.dp
            )
        )
    } else {
        Modifier
    }

    Box(
        modifier = modifier
            .then(shadowModifier)
            .clip(shape)
            .then(hazeModifier)
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        baseColor.copy(alpha = (baseColor.alpha * 1.15f).coerceAtMost(1f)),
                        baseColor,
                        baseColor.copy(alpha = (baseColor.alpha * 0.90f).coerceAtMost(1f))
                    )
                ),
                shape = shape
            )
            .drawBehind {
                if (showTopHighlight) {
                    val strokeW = 1.dp.toPx()
                    // Top physical specular highlight line (exact match to reference-web via-white/35)
                    drawLine(
                        brush = Brush.horizontalGradient(
                            colors = listOf(
                                Color.Transparent,
                                highlightColor,
                                Color.Transparent
                            )
                        ),
                        start = Offset(size.width * 0.12f, strokeW),
                        end = Offset(size.width * 0.88f, strokeW),
                        strokeWidth = strokeW
                    )
                }
            }
            .border(
                width = borderWidth,
                brush = Brush.verticalGradient(
                    colors = listOf(
                        borderColor.copy(alpha = (borderColor.alpha * 1.3f).coerceAtMost(1f)),
                        borderColor.copy(alpha = (borderColor.alpha * 0.6f).coerceAtMost(1f))
                    )
                ),
                shape = shape
            ),
        content = content
    )
}
