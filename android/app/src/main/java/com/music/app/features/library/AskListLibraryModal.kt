package com.music.app.features.library

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.music.app.core.designsystem.theme.AudexFontFamily

@Composable
fun AskListLibraryModal(
    isOpen: Boolean,
    onClose: () -> Unit,
    onSelectLibrary: (String) -> Unit,
    libraries: List<String> = listOf("Liked Songs", "Chill Waves", "Gaming Sessions", "Recent Grooves", "Favorites"),
    modifier: Modifier = Modifier
) {
    if (!isOpen) return

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.65f))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null
            ) { onClose() },
        contentAlignment = Alignment.Center
    ) {
        val figmaModalShape = RoundedCornerShape(57.dp)

        Column(
            modifier = Modifier
                .width(360.dp)
                .height(440.dp)
                .shadow(elevation = 32.dp, shape = figmaModalShape)
                .clip(figmaModalShape)
                .background(
                    brush = Brush.radialGradient(
                        colors = listOf(
                            Color(0xFF2A2A2A).copy(alpha = 0.94f),
                            Color(0xFF1A1A1A).copy(alpha = 0.96f),
                            Color(0xFF0E0E0E).copy(alpha = 0.98f)
                        )
                    )
                )
                .border(1.dp, Color.White.copy(alpha = 0.16f), figmaModalShape)
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null
                ) { /* intercept clicks inside */ }
                .padding(top = 22.dp, start = 20.dp, end = 20.dp, bottom = 18.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Figma Node 118:695: "witch library you want to save ?"
            Text(
                text = "witch library you want to\nsave ?",
                fontFamily = AudexFontFamily,
                fontSize = 20.sp,
                fontWeight = FontWeight.Normal,
                color = Color.White,
                textAlign = TextAlign.Center,
                lineHeight = 24.sp,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            // 2-Column Grid
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(4.dp),
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                items(libraries) { libName ->
                    val isHeart = libName.lowercase().contains("like") || libName.lowercase().contains("favorite")
                    val itemShape = RoundedCornerShape(24.dp)

                    Column(
                        modifier = Modifier
                            .height(110.dp)
                            .clip(itemShape)
                            .background(Color.White.copy(alpha = 0.06f))
                            .border(1.dp, Color.White.copy(alpha = 0.12f), itemShape)
                            .clickable {
                                onSelectLibrary(libName)
                                onClose()
                            }
                            .padding(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = if (isHeart) Icons.Default.Favorite else Icons.Default.Bookmark,
                            contentDescription = libName,
                            tint = if (isHeart) Color(0xFFFB7185) else Color(0xFF999999),
                            modifier = Modifier.size(32.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = libName,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFFEDEDED),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }
    }
}
