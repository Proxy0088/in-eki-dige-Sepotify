package com.music.app.features.playlist

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.rounded.QueueMusic
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.music.app.core.designsystem.components.LiquidGlassSurface
import com.music.app.core.designsystem.components.LiquidGlassVariant
import com.music.app.core.model.Track
import dev.chrisbanes.haze.HazeState

/**
 * Native Liquid Glass Sheet for saving songs to Liked, Downloads, or Playlists/Folders.
 * - Morphing spring entrance animation
 * - Liquid Glass material matching ECC-2.2.3 Liquid Glass design
 * - Live playlist toggling and dynamic playlist creation
 */
@Composable
fun AddToPlaylistSheet(
    track: Track?,
    isLiked: Boolean,
    isDownloaded: Boolean,
    playlists: Set<String>,
    playlistsMap: Map<String, List<Track>>,
    onToggleLike: (Track) -> Unit,
    onToggleDownload: (Track) -> Unit,
    onTogglePlaylist: (String, Track) -> Unit,
    onCreatePlaylist: (String) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    hazeState: HazeState? = null
) {
    if (track == null) return

    var newPlaylistName by remember { mutableStateOf("") }
    var isCreatingInline by remember { mutableStateOf(false) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.55f))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onDismiss
            ),
        contentAlignment = Alignment.BottomCenter
    ) {
        // Stop click propagation inside the sheet
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 10.dp, vertical = 12.dp)
                .navigationBarsPadding()
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    onClick = {} // consume click
                )
        ) {
            LiquidGlassSurface(
                modifier = Modifier
                    .fillMaxWidth(),
                hazeState = hazeState,
                shape = RoundedCornerShape(28.dp),
                variant = LiquidGlassVariant.Dock,
                borderWidth = 1.dp,
                showTopHighlight = true
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 16.dp)
                ) {
                    // Top Drag Indicator Handle
                    Box(
                        modifier = Modifier
                            .align(Alignment.CenterHorizontally)
                            .width(42.dp)
                            .height(4.dp)
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.28f))
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Header Row with Title and Close button
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "Save Song To...",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFEDEDED)
                            )
                            Text(
                                text = "Choose a destination folder or playlist",
                                fontSize = 12.sp,
                                color = Color(0xFFA1A1A6)
                            )
                        }

                        IconButton(
                            onClick = onDismiss,
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Close",
                                tint = Color(0xFFA1A1A6),
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Track Info Card inside the sheet
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(Color.White.copy(alpha = 0.06f))
                            .border(1.dp, Color.White.copy(alpha = 0.10f), RoundedCornerShape(16.dp))
                            .padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Artwork Squircle
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(Brush.linearGradient(track.gradientColors)),
                            contentAlignment = Alignment.Center
                        ) {
                            if (!track.coverUrl.isNullOrEmpty()) {
                                AsyncImage(
                                    model = track.coverUrl,
                                    contentDescription = track.title,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize()
                                )
                            }
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = track.title,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color(0xFFEDEDED),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = track.artist,
                                fontSize = 12.sp,
                                color = Color(0xFFA1A1A6),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Playlists / Folders List
                    val allPlaylists = remember(playlists, playlistsMap) {
                        val set = mutableSetOf("Chill Waves", "Gaming Sessions", "Recent Grooves")
                        set.addAll(playlists)
                        set.addAll(playlistsMap.keys)
                        set.toList()
                    }

                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(220.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // 1. Liked Songs Row
                        item(key = "dest_liked") {
                            PlaylistOptionRow(
                                title = "Liked Songs",
                                subtitle = "Your primary favorites collection",
                                icon = if (isLiked) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                                iconColor = if (isLiked) Color(0xFFF43F5E) else Color(0xFFA1A1A6),
                                isSelected = isLiked,
                                onClick = { onToggleLike(track) }
                            )
                        }

                        // 2. Downloads Row
                        item(key = "dest_downloads") {
                            PlaylistOptionRow(
                                title = "Downloads",
                                subtitle = "Offline & local cache",
                                icon = Icons.Default.Download,
                                iconColor = if (isDownloaded) Color(0xFF22D3EE) else Color(0xFFA1A1A6),
                                isSelected = isDownloaded,
                                onClick = { onToggleDownload(track) }
                            )
                        }

                        // 3. Dynamic User Playlists
                        items(items = allPlaylists, key = { "pl_$it" }) { plName ->
                            val tracksInPl = playlistsMap[plName] ?: emptyList()
                            val isInPlaylist = tracksInPl.any { it.id == track.id }
                            PlaylistOptionRow(
                                title = plName,
                                subtitle = "${tracksInPl.size} tracks",
                                icon = Icons.Rounded.QueueMusic,
                                iconColor = if (isInPlaylist) Color(0xFFF59E0B) else Color(0xFFA1A1A6),
                                isSelected = isInPlaylist,
                                onClick = { onTogglePlaylist(plName, track) }
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Create New Playlist Inline
                    if (isCreatingInline) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(46.dp)
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.08f))
                                .border(1.dp, Color(0xFF22D3EE).copy(alpha = 0.4f), CircleShape)
                                .padding(horizontal = 14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            BasicTextField(
                                value = newPlaylistName,
                                onValueChange = { newPlaylistName = it },
                                textStyle = TextStyle(
                                    color = Color(0xFFEDEDED),
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Normal
                                ),
                                cursorBrush = SolidColor(Color(0xFF22D3EE)),
                                singleLine = true,
                                modifier = Modifier.weight(1f),
                                decorationBox = { innerTextField ->
                                    if (newPlaylistName.isEmpty()) {
                                        Text(
                                            text = "New playlist name...",
                                            fontSize = 13.sp,
                                            color = Color(0xFF71717A)
                                        )
                                    }
                                    innerTextField()
                                }
                            )

                            Spacer(modifier = Modifier.width(8.dp))

                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFF22D3EE))
                                    .clickable {
                                        if (newPlaylistName.isNotBlank()) {
                                            val name = newPlaylistName.trim()
                                            onCreatePlaylist(name)
                                            onTogglePlaylist(name, track)
                                            newPlaylistName = ""
                                            isCreatingInline = false
                                        }
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Check,
                                    contentDescription = "Save",
                                    tint = Color(0xFF090A0F),
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    } else {
                        // Button to trigger inline creation
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(44.dp)
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.08f))
                                .border(1.dp, Color.White.copy(alpha = 0.14f), CircleShape)
                                .clickable { isCreatingInline = true }
                                .padding(horizontal = 16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Add,
                                contentDescription = "Add Playlist",
                                tint = Color(0xFF22D3EE),
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Create New Playlist",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium,
                                color = Color(0xFFEDEDED)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PlaylistOptionRow(
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconColor: Color,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val interaction = remember { MutableInteractionSource() }
    val isPressed by interaction.collectIsPressedAsState()

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(
                if (isSelected) Color(0xFF22D3EE).copy(alpha = 0.12f) else Color.White.copy(alpha = 0.04f)
            )
            .border(
                1.dp,
                if (isSelected) Color(0xFF22D3EE).copy(alpha = 0.40f) else Color.White.copy(alpha = 0.07f),
                RoundedCornerShape(16.dp)
            )
            .clickable(
                interactionSource = interaction,
                indication = null,
                onClick = onClick
            )
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.weight(1f)
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.06f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = iconColor,
                    modifier = Modifier.size(18.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column {
                Text(
                    text = title,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFFEDEDED)
                )
                Text(
                    text = subtitle,
                    fontSize = 11.sp,
                    color = Color(0xFFA1A1A6)
                )
            }
        }

        // Selection Checkmark Badge
        if (isSelected) {
            Box(
                modifier = Modifier
                    .size(24.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF22D3EE)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = "Selected",
                    tint = Color(0xFF090A0F),
                    modifier = Modifier.size(14.dp)
                )
            }
        }
    }
}
