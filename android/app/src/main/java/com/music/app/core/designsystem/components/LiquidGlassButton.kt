package com.music.app.core.designsystem.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import dev.chrisbanes.haze.HazeState

/**
 * Reusable Player Glass Button.
 * Supports standard Button variant and ClearGlass (uncolored transparent) variant.
 */
@Composable
fun LiquidGlassButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    size: Dp = 44.dp,
    shape: Shape = CircleShape,
    hazeState: HazeState? = null,
    variant: LiquidGlassVariant = LiquidGlassVariant.Button,
    icon: ImageVector? = null,
    iconSize: Dp = 20.dp,
    tint: Color = Color.White,
    contentDescription: String? = null,
    content: (@Composable () -> Unit)? = null
) {
    val interactionSource = remember { MutableInteractionSource() }

    LiquidGlassSurface(
        modifier = modifier
            .size(size)
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onClick
            ),
        hazeState = hazeState,
        shape = shape,
        variant = variant,
        borderWidth = 1.dp,
        showTopHighlight = true
    ) {
        Box(
            modifier = Modifier.matchParentSize(),
            contentAlignment = Alignment.Center
        ) {
            if (content != null) {
                content()
            } else if (icon != null) {
                Icon(
                    imageVector = icon,
                    contentDescription = contentDescription,
                    tint = tint,
                    modifier = Modifier.size(iconSize)
                )
            }
        }
    }
}
