package com.music.app.core.designsystem.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

enum class NetworkStatus {
    IDLE,
    OFFLINE,
    RESTORED
}

@Composable
fun NetworkStatusToast(
    status: NetworkStatus,
    modifier: Modifier = Modifier
) {
    AnimatedVisibility(
        visible = status != NetworkStatus.IDLE,
        enter = slideInVertically(initialOffsetY = { -it }) + fadeIn(),
        exit = slideOutVertically(targetOffsetY = { -it }) + fadeOut(),
        modifier = modifier
    ) {
        val isOffline = status == NetworkStatus.OFFLINE
        val bgColor = if (isOffline) Color(0xFF450A0A).copy(alpha = 0.92f) else Color(0xFF064E3B).copy(alpha = 0.92f)
        val borderColor = if (isOffline) Color(0xFFDC2626).copy(alpha = 0.4f) else Color(0xFF10B981).copy(alpha = 0.4f)
        val textColor = if (isOffline) Color(0xFFFECACA) else Color(0xFFA7F3D0)

        Box(
            modifier = Modifier
                .clip(CircleShape)
                .background(bgColor)
                .border(1.dp, borderColor, CircleShape)
                .padding(horizontal = 16.dp, vertical = 8.dp),
            contentAlignment = Alignment.Center
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                if (isOffline) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFEF4444))
                    )
                    Icon(
                        imageVector = Icons.Default.WifiOff,
                        contentDescription = "Offline",
                        tint = Color(0xFFF87171),
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = "اتصال اینترنت قطع شد • در انتظار اتصال مجدد...",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = textColor
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.Wifi,
                        contentDescription = "Online",
                        tint = Color(0xFF34D399),
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = "اتصال اینترنت برقرار شد",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = textColor
                    )
                }
            }
        }
    }
}
