package com.music.app.core.designsystem.components

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.music.app.core.designsystem.theme.AudexFontFamily
import dev.chrisbanes.haze.HazeState

/**
 * Top capsule header matching reference-web/src/components/TopCapsule.tsx
 * - Height: 68.dp
 * - Corner radius: 36.dp
 * - Typography: Audex 400 32.sp (#EDEDED)
 * - Profile button: 37.dp circle with account vector
 * - Specular top highlight + native liquid glass blur
 */
@Composable
fun TopCapsule(
    title: String,
    modifier: Modifier = Modifier,
    hazeState: HazeState? = null,
    onProfileClick: () -> Unit = {}
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(top = 10.dp, start = 14.dp, end = 14.dp),
        contentAlignment = Alignment.Center
    ) {
        LiquidGlassSurface(
            modifier = Modifier
                .fillMaxWidth()
                .height(68.dp),
            hazeState = hazeState,
            shape = RoundedCornerShape(36.dp),
            variant = LiquidGlassVariant.Dock,
            blurRadius = 14.dp,
            showTopHighlight = true
        ) {
            Row(
                modifier = Modifier
                    .matchParentSize()
                    .padding(horizontal = 24.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Title (Audex font)
                Text(
                    text = title.ifEmpty { "Home" },
                    fontFamily = AudexFontFamily,
                    fontWeight = FontWeight.Normal,
                    fontSize = 32.sp,
                    color = Color(0xFFEDEDED),
                    letterSpacing = (-0.5).sp
                )

                // Profile / Settings Button
                val interactionSource = remember { MutableInteractionSource() }
                val isPressed by interactionSource.collectIsPressedAsState()
                val profileScale by animateFloatAsState(
                    targetValue = if (isPressed) 0.88f else 1f,
                    animationSpec = spring(stiffness = Spring.StiffnessMedium, dampingRatio = 0.65f),
                    label = "profileScale"
                )

                Box(
                    modifier = Modifier
                        .size(37.dp)
                        .graphicsLayer {
                            scaleX = profileScale
                            scaleY = profileScale
                        }
                        .clip(CircleShape)
                        .clickable(
                            interactionSource = interactionSource,
                            indication = null,
                            onClick = onProfileClick
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Filled.AccountCircle,
                        contentDescription = "Profile and settings",
                        tint = Color(0xFFD1D1D6),
                        modifier = Modifier.size(31.dp)
                    )
                }
            }
        }
    }
}
