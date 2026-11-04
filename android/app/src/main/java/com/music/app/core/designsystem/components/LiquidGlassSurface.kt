package com.music.app.core.designsystem.components

import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import dev.chrisbanes.haze.HazeTint
import dev.chrisbanes.haze.hazeChild

enum class LiquidGlassVariant {
    Dock,
    Button,
    ActivePill,
    Card,
    ClearGlass // Uncolored, transparent liquid glass showing moving ambient halos underneath
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
    blurRadius: Dp = 12.dp,
    showTopHighlight: Boolean = true,
    content: @Composable BoxScope.() -> Unit
) {
    val isDark = LocalIsDarkTheme.current
    val isApi31Plus = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S

    // Glass Background Color depending on Variant & Theme
    val baseColor = when (variant) {
        LiquidGlassVariant.Dock -> if (isDark) {
            if (isApi31Plus) GlassDockDark else Color(0x99283248)
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
        LiquidGlassVariant.ClearGlass -> if (isDark) {
            Color.White.copy(alpha = 0.05f) // Pure transparent glass, zero dark fill
        } else {
            Color.White.copy(alpha = 0.18f)
        }
    }

    // Border Colors
    val borderColor = if (variant == LiquidGlassVariant.ClearGlass) {
        Color.White.copy(alpha = 0.28f)
    } else if (isDark) {
        GlassBorderDark
    } else {
        GlassBorderLight
    }

    // Top catch-light specular color
    val highlightColor = if (variant == LiquidGlassVariant.ClearGlass) {
        Color.White.copy(alpha = 0.50f)
    } else if (isDark) {
        GlassHighlightDark
    } else {
        Color(0x80FFFFFF)
    }

    // Shadow setup
    val shadowElevation = when (variant) {
        LiquidGlassVariant.Dock -> 12.dp
        LiquidGlassVariant.Button -> 8.dp
        LiquidGlassVariant.ActivePill -> 4.dp
        LiquidGlassVariant.Card -> 20.dp
        LiquidGlassVariant.ClearGlass -> 0.dp // No shadow blocking the vibrant halos below
    }

    val shadowModifier = if (variant != LiquidGlassVariant.ActivePill && variant != LiquidGlassVariant.ClearGlass) {
        Modifier.shadow(
            elevation = shadowElevation,
            shape = shape,
            spotColor = Color.Black.copy(alpha = if (isDark) 0.20f else 0.08f),
            ambientColor = Color.Transparent
        )
    } else {
        Modifier
    }

    val hazeModifier = if (hazeState != null && isApi31Plus) {
        Modifier.hazeChild(
            state = hazeState,
            style = HazeStyle(
                backgroundColor = if (variant == LiquidGlassVariant.ClearGlass) Color.Transparent else if (isDark) Color(0x1A1E2433) else Color(0xFFF8F9FA),
                tint = if (isDark) HazeTint(color = Color.White.copy(alpha = 0.07f)) else null,
                blurRadius = blurRadius
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
                    colors = if (isDark && variant == LiquidGlassVariant.Dock) {
                        listOf(
                            Color.White.copy(alpha = 0.14f),
                            baseColor,
                            baseColor.copy(alpha = (baseColor.alpha * 0.70f).coerceAtMost(1f))
                        )
                    } else {
                        listOf(
                            baseColor.copy(alpha = (baseColor.alpha * 1.2f).coerceAtMost(1f)),
                            baseColor,
                            baseColor.copy(alpha = (baseColor.alpha * 0.85f).coerceAtMost(1f))
                        )
                    }
                ),
                shape = shape
            )
            .drawBehind {
                if (showTopHighlight) {
                    val strokeW = 1.dp.toPx()
                    // Top physical specular highlight line
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
