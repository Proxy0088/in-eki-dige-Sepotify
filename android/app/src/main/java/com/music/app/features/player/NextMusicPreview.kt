package com.music.app.features.player

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.music.app.core.model.Track

@Composable
fun NextMusicPreview(
    nextTrack: Track?,
    isVisible: Boolean,
    modifier: Modifier = Modifier
) {
    AnimatedVisibility(
        visible = isVisible && nextTrack != null,
        enter = slideInVertically(initialOffsetY = { it / 2 }) + fadeIn(),
        exit = slideOutVertically(targetOffsetY = { it / 2 }) + fadeOut(),
        modifier = modifier
    ) {
        if (nextTrack == null) return@AnimatedVisibility

        val cardShape = RoundedCornerShape(24.dp)

        Box(
            modifier = Modifier
                .width(233.dp)
                .height(79.dp)
                .shadow(elevation = 12.dp, shape = cardShape, spotColor = Color.Black)
                .clip(cardShape)
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(Color(0xFF171717), Color(0xFF242424))
                    )
                )
                .border(1.dp, Color(0xFF292929), cardShape)
                .padding(horizontal = 10.dp),
            contentAlignment = Alignment.CenterStart
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Thumbnail container (55x57 dp, 22dp radius)
                val thumbShape = RoundedCornerShape(20.dp)
                Box(
                    modifier = Modifier
                        .size(width = 55.dp, height = 57.dp)
                        .clip(thumbShape)
                        .background(Color(0xFF212121))
                        .border(1.dp, Color.White.copy(alpha = 0.08f), thumbShape),
                    contentAlignment = Alignment.Center
                ) {
                    if (!nextTrack.coverUrl.isNullOrEmpty()) {
                        AsyncImage(
                            model = nextTrack.coverUrl,
                            contentDescription = nextTrack.title,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Default.MusicNote,
                            contentDescription = null,
                            tint = Color(0xFF999999),
                            modifier = Modifier.size(24.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                // Track title & artist
                Column(
                    modifier = Modifier.weight(1f)
                ) {
                    Text(
                        text = nextTrack.title,
                        color = Color.White,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = nextTrack.artist,
                        color = Color(0xFFA0A0A0),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Normal,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}
