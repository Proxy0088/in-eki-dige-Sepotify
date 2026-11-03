package com.music.app.core.designsystem.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.ui.draw.drawBehind
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.chrisbanes.haze.HazeState

enum class NavTab(val titleEn: String, val titleFa: String) {
    HOME("Home", "خانه"),
    SEARCH("Search", "جست‌وجو"),
    LIBRARY("Playlists", "پلی‌لیست")
}

/**
 * Pixel-perfect Bottom Floating Navigation Dock.
 * Token-matched to reference-web/src/components/BottomNav.tsx (.lastwave-glass-dock + .lastwave-glass-active).
 */
@Composable
fun BottomNav(
    activeTab: NavTab,
    onTabSelected: (NavTab) -> Unit,
    modifier: Modifier = Modifier,
    hazeState: HazeState? = null,
    isPlaying: Boolean = false,
    isPersian: Boolean = false
) {
    val isDark = isSystemInDarkTheme()

    Box(
        modifier = modifier
            .navigationBarsPadding()
            .padding(bottom = 20.dp),
        contentAlignment = Alignment.Center
    ) {
        LiquidGlassSurface(
            modifier = Modifier.height(52.dp),
            hazeState = hazeState,
            shape = CircleShape,
            variant = LiquidGlassVariant.Dock,
            borderWidth = 1.dp,
            showTopHighlight = true
        ) {
            Row(
                modifier = Modifier
                    .padding(horizontal = 6.dp, vertical = 5.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                NavTab.entries.forEach { tab ->
                    val isActive = activeTab == tab
                    val label = if (isPersian) tab.titleFa else tab.titleEn
                    val interactionSource = remember { MutableInteractionSource() }

                    val iconTint by animateColorAsState(
                        targetValue = if (isActive) {
                            if (isDark) Color.White else Color(0xFF0F172A)
                        } else {
                            if (isDark) Color(0xFFB8B8BE) else Color(0xFF64748B)
                        },
                        animationSpec = spring(stiffness = Spring.StiffnessMedium),
                        label = "iconTint"
                    )

                    Box(
                        modifier = Modifier
                            .height(40.dp)
                            .clip(CircleShape)
                            .then(
                                if (isActive) {
                                    Modifier
                                        .shadow(
                                            elevation = 4.dp,
                                            shape = CircleShape,
                                            spotColor = Color.Black.copy(alpha = 0.25f)
                                        )
                                        .background(
                                            brush = Brush.linearGradient(
                                                colors = if (isDark) {
                                                    listOf(
                                                        Color.White.copy(alpha = 0.16f),
                                                        Color.White.copy(alpha = 0.05f)
                                                    )
                                                } else {
                                                    listOf(
                                                        Color(0xFF0F172A).copy(alpha = 0.12f),
                                                        Color(0xFF0F172A).copy(alpha = 0.06f)
                                                    )
                                                }
                                            ),
                                            shape = CircleShape
                                        )
                                        .drawBehind {
                                            // Internal meniscus specular reflection (top 2dp edge)
                                            drawLine(
                                                brush = Brush.horizontalGradient(
                                                    colors = listOf(
                                                        Color.Transparent,
                                                        Color.White.copy(alpha = 0.28f),
                                                        Color.Transparent
                                                    )
                                                ),
                                                start = Offset(size.width * 0.15f, 1.dp.toPx()),
                                                end = Offset(size.width * 0.85f, 1.dp.toPx()),
                                                strokeWidth = 1.5.dp.toPx()
                                            )
                                        }
                                        .border(
                                            width = 1.dp,
                                            color = if (isDark) Color.White.copy(alpha = 0.20f) else Color(0x330F172A),
                                            shape = CircleShape
                                        )
                                } else {
                                    Modifier
                                }
                            )
                            .clickable(
                                interactionSource = interactionSource,
                                indication = null,
                                onClick = { onTabSelected(tab) }
                            )
                            .padding(
                                horizontal = if (isActive) 14.dp else 11.dp,
                                vertical = 6.dp
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            // Icon container with optional playing indicator dot
                            Box(
                                contentAlignment = Alignment.Center
                            ) {
                                when (tab) {
                                    NavTab.HOME -> {
                                        Icon(
                                            imageVector = Icons.Rounded.Home,
                                            contentDescription = label,
                                            tint = iconTint,
                                            modifier = Modifier.size(19.dp)
                                        )
                                        if (isPlaying) {
                                            Box(
                                                modifier = Modifier
                                                    .size(6.dp)
                                                    .align(Alignment.TopEnd)
                                                    .offset(x = 2.dp, y = (-2).dp)
                                                    .shadow(
                                                        elevation = 4.dp,
                                                        shape = CircleShape,
                                                        spotColor = Color(0xFF22D3EE)
                                                    )
                                                    .background(Color(0xFF22D3EE), CircleShape)
                                            )
                                        }
                                    }
                                    NavTab.SEARCH -> {
                                        Icon(
                                            imageVector = Icons.Rounded.Search,
                                            contentDescription = label,
                                            tint = iconTint,
                                            modifier = Modifier.size(19.dp)
                                        )
                                    }
                                    NavTab.LIBRARY -> {
                                        // Custom Lucide-styled library icon
                                        LucideLibraryIcon(
                                            tint = iconTint,
                                            modifier = Modifier.size(19.dp)
                                        )
                                    }
                                }
                            }

                            // Animated Label for Active Tab
                            AnimatedVisibility(
                                visible = isActive,
                                enter = fadeIn(
                                    animationSpec = spring(
                                        stiffness = 420f,
                                        dampingRatio = 0.75f
                                    )
                                ),
                                exit = fadeOut()
                            ) {
                                Row {
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = label,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = if (isDark) Color.White else Color(0xFF0F172A),
                                        letterSpacing = (-0.2).sp
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

/**
 * Lucide Library icon composed of 3 books (2 upright, 1 leaning)
 */
@Composable
private fun LucideLibraryIcon(
    tint: Color,
    modifier: Modifier = Modifier
) {
    androidx.compose.foundation.Canvas(modifier = modifier) {
        val strokeWidth = 1.8.dp.toPx()
        val w = size.width
        val h = size.height

        // Book 1 (left vertical)
        drawLine(
            color = tint,
            start = Offset(w * 0.20f, h * 0.18f),
            end = Offset(w * 0.20f, h * 0.82f),
            strokeWidth = strokeWidth,
            cap = StrokeCap.Round
        )

        // Book 2 (middle vertical)
        drawLine(
            color = tint,
            start = Offset(w * 0.48f, h * 0.18f),
            end = Offset(w * 0.48f, h * 0.82f),
            strokeWidth = strokeWidth,
            cap = StrokeCap.Round
        )

        // Book 3 (right slanted book)
        drawLine(
            color = tint,
            start = Offset(w * 0.72f, h * 0.22f),
            end = Offset(w * 0.88f, h * 0.82f),
            strokeWidth = strokeWidth,
            cap = StrokeCap.Round
        )
    }
}
