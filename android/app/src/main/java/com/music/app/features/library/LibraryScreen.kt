package com.music.app.features.library

import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.PushPin
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.music.app.core.designsystem.components.MusicRow
import com.music.app.core.designsystem.theme.AudexFontFamily
import com.music.app.core.model.Track

data class LibraryCollection(
    val id: String,
    val name: String,
    val isLiked: Boolean = false,
    val isDownloads: Boolean = false
)

@Composable
fun LibraryScreen(
    tracks: List<Track>,
    currentTrack: Track?,
    isPlaying: Boolean,
    onPlayTrack: (Track) -> Unit,
    onToggleLike: (Track) -> Unit,
    onToggleDownload: (Track) -> Unit,
    onAddToPlaylist: ((Track) -> Unit)? = null,
    playlistsMap: Map<String, List<Track>> = emptyMap(),
    userLibraries: Set<String> = emptySet(),
    onCreatePlaylist: ((String) -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val collections = remember(userLibraries) {
        val base = mutableListOf(
            LibraryCollection("liked", "Liked Songs", isLiked = true),
            LibraryCollection("downloads", "Downloads", isDownloads = true)
        )
        val customLibs = if (userLibraries.isNotEmpty()) userLibraries else setOf("Chill Waves", "Gaming Sessions", "Recent Grooves")
        customLibs.forEach { name ->
            base.add(LibraryCollection(name.lowercase(), name))
        }
        mutableStateListOf<LibraryCollection>().apply { addAll(base) }
    }

    var selectedCollection by remember { mutableStateOf<LibraryCollection?>(null) }
    var showCreateDialog by remember { mutableStateOf(false) }
    var newPlaylistName by remember { mutableStateOf("") }
    var showSortMenu by remember { mutableStateOf(false) }
    var sortOption by remember { mutableStateOf("default") } // "default", "name", "count"

    fun getTracksForCollection(col: LibraryCollection): List<Track> {
        return when {
            col.isLiked -> tracks.filter { it.isLiked }
            col.isDownloads -> tracks.filter { it.isDownloaded }
            else -> {
                val fromMap = playlistsMap[col.name] ?: emptyList()
                if (fromMap.isNotEmpty()) fromMap
                else tracks.filter { it.collection.equals(col.name, ignoreCase = true) || it.collection.equals(col.id, ignoreCase = true) }
            }
        }
    }

    val sortedCollections = remember(collections, sortOption, tracks) {
        when (sortOption) {
            "name" -> collections.sortedBy { it.name }
            "count" -> collections.sortedByDescending { getTracksForCollection(it).size }
            else -> collections
        }
    }

    AnimatedContent(
        targetState = selectedCollection,
        label = "library_view_transition"
    ) { activeCol ->
        if (activeCol == null) {
            // ── Main Playlists List View ──
            LazyColumn(
                modifier = modifier.fillMaxSize(),
                contentPadding = PaddingValues(top = 130.dp, bottom = 175.dp, start = 16.dp, end = 16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Header with counts & actions
                item(key = "library_header") {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 4.dp, vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(
                                text = "Playlists",
                                fontFamily = AudexFontFamily,
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFEDEDED)
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "${collections.size} playlists • ${tracks.size} tracks",
                                fontSize = 12.sp,
                                color = Color(0xFFA1A1A6)
                            )
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            // Add button
                            Box(
                                modifier = Modifier
                                    .size(34.dp)
                                    .clip(CircleShape)
                                    .background(Color.White.copy(alpha = 0.08f))
                                    .border(1.dp, Color.White.copy(alpha = 0.12f), CircleShape)
                                    .clickable { showCreateDialog = true },
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Add,
                                    contentDescription = "New playlist",
                                    tint = Color(0xFFEDEDED),
                                    modifier = Modifier.size(18.dp)
                                )
                            }

                            // Sort dropdown
                            Box {
                                Box(
                                    modifier = Modifier
                                        .size(34.dp)
                                        .clip(CircleShape)
                                        .background(Color.White.copy(alpha = 0.08f))
                                        .border(1.dp, Color.White.copy(alpha = 0.12f), CircleShape)
                                        .clickable { showSortMenu = true },
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.FilterList,
                                        contentDescription = "Sort",
                                        tint = Color(0xFFEDEDED),
                                        modifier = Modifier.size(18.dp)
                                    )
                                }

                                DropdownMenu(
                                    expanded = showSortMenu,
                                    onDismissRequest = { showSortMenu = false }
                                ) {
                                    DropdownMenuItem(
                                        text = { Text("Default") },
                                        onClick = {
                                            sortOption = "default"
                                            showSortMenu = false
                                        }
                                    )
                                    DropdownMenuItem(
                                        text = { Text("Name (A-Z)") },
                                        onClick = {
                                            sortOption = "name"
                                            showSortMenu = false
                                        }
                                    )
                                    DropdownMenuItem(
                                        text = { Text("Track Count") },
                                        onClick = {
                                            sortOption = "count"
                                            showSortMenu = false
                                        }
                                    )
                                }
                            }
                        }
                    }
                }

                // Playlist Cards
                items(sortedCollections, key = { it.id }) { col ->
                    val colTracks = getTracksForCollection(col)
                    val firstCover = colTracks.firstOrNull { !it.coverUrl.isNullOrEmpty() }?.coverUrl

                    val cardShape = RoundedCornerShape(18.dp)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(68.dp)
                            .clip(cardShape)
                            .background(Color(0xFF12141C))
                            .border(1.dp, Color.White.copy(alpha = 0.06f), cardShape)
                            .clickable { selectedCollection = col }
                            .padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            modifier = Modifier.weight(1f),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Cover
                            Box(
                                modifier = Modifier
                                    .size(48.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(
                                        brush = Brush.linearGradient(
                                            listOf(Color(0xFF222533), Color(0xFF161822))
                                        )
                                    )
                                    .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(12.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                var hasFirstCover by remember(col.id) { mutableStateOf(false) }

                                if (!firstCover.isNullOrEmpty()) {
                                    AsyncImage(
                                        model = firstCover,
                                        contentDescription = col.name,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier.fillMaxSize(),
                                        onSuccess = { hasFirstCover = true },
                                        onError = { hasFirstCover = false }
                                    )
                                }

                                if (!hasFirstCover) {
                                    Icon(
                                        imageVector = Icons.Default.MusicNote,
                                        contentDescription = null,
                                        tint = Color(0xFF71717A),
                                        modifier = Modifier.size(22.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.width(14.dp))

                            Column {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(
                                        text = col.name,
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Color(0xFFEDEDED),
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    if (col.isLiked) {
                                        Icon(
                                            imageVector = Icons.Default.PushPin,
                                            contentDescription = "Pinned",
                                            tint = Color(0xFF22D3EE),
                                            modifier = Modifier.size(13.dp)
                                        )
                                    }
                                }
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "${colTracks.size} tracks",
                                    fontSize = 12.sp,
                                    color = Color(0xFFA1A1A6)
                                )
                            }
                        }

                        // Right action buttons
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            // Solid white play button
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFFEDEDED))
                                    .clickable {
                                        if (colTracks.isNotEmpty()) {
                                            onPlayTrack(colTracks.first())
                                        }
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.PlayArrow,
                                    contentDescription = "Play collection",
                                    tint = Color(0xFF07080B),
                                    modifier = Modifier.size(20.dp)
                                )
                            }

                            IconButton(
                                onClick = { selectedCollection = col },
                                modifier = Modifier.size(30.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.MoreVert,
                                    contentDescription = "More",
                                    tint = Color(0xFF71717A),
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    }
                }
            }
        } else {
            // ── Collection Tracks Detail View ──
            val colTracks = getTracksForCollection(activeCol)

            LazyColumn(
                modifier = modifier.fillMaxSize(),
                contentPadding = PaddingValues(top = 130.dp, bottom = 175.dp, start = 16.dp, end = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Header with Back button & Play All
                item(key = "detail_header") {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.clickable { selectedCollection = null }
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(CircleShape)
                                    .background(Color.White.copy(alpha = 0.08f))
                                    .border(1.dp, Color.White.copy(alpha = 0.12f), CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                    contentDescription = "Back",
                                    tint = Color(0xFFEDEDED),
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                            Text(
                                text = activeCol.name,
                                fontFamily = AudexFontFamily,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFEDEDED)
                            )
                        }

                        if (colTracks.isNotEmpty()) {
                            Box(
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .background(Color(0xFF22D3EE).copy(alpha = 0.2f))
                                    .border(1.dp, Color(0xFF22D3EE).copy(alpha = 0.4f), CircleShape)
                                    .clickable { onPlayTrack(colTracks.first()) }
                                    .padding(horizontal = 14.dp, vertical = 6.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.PlayArrow,
                                        contentDescription = "Play all",
                                        tint = Color(0xFF22D3EE),
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Text(
                                        text = "Play all",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Color(0xFF22D3EE)
                                    )
                                }
                            }
                        }
                    }
                }

                // Fully Virtualized Tracks in collection
                if (colTracks.isNotEmpty()) {
                    items(
                        items = colTracks,
                        key = { it.id }
                    ) { track ->
                        MusicRow(
                            track = track,
                            isPlaying = isPlaying,
                            isCurrent = currentTrack?.id == track.id,
                            onPlay = onPlayTrack,
                            onToggleLike = { onAddToPlaylist?.invoke(it) ?: onToggleLike(it) },
                            onToggleDownload = onToggleDownload,
                            onMoreClick = onAddToPlaylist
                        )
                    }
                } else {
                    item(key = "empty_col") {
                        val containerShape = RoundedCornerShape(24.dp)
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(containerShape)
                                .background(Color(0xFF14161F))
                                .border(1.dp, Color.White.copy(alpha = 0.06f), containerShape)
                                .padding(vertical = 48.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.MusicNote,
                                contentDescription = null,
                                tint = Color(0xFF71717A).copy(alpha = 0.4f),
                                modifier = Modifier.size(36.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "This playlist is empty",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium,
                                color = Color(0xFFA1A1A6)
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "You can add songs to this playlist while listening.",
                                fontSize = 12.sp,
                                color = Color(0xFF71717A)
                            )
                        }
                    }
                }
            }
        }
    }

    // ── Create New Playlist Dialog ──
    if (showCreateDialog) {
        AlertDialog(
            onDismissRequest = { showCreateDialog = false },
            title = {
                Text(
                    text = "New Playlist",
                    fontFamily = AudexFontFamily,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFFEDEDED)
                )
            },
            text = {
                Column {
                    Text(
                        text = "Enter a name for the new playlist folder:",
                        fontSize = 12.sp,
                        color = Color(0xFFA1A1A6)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = newPlaylistName,
                        onValueChange = { newPlaylistName = it },
                        placeholder = { Text("Playlist name...", color = Color(0xFF71717A)) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val trimmed = newPlaylistName.trim()
                        if (trimmed.isNotEmpty()) {
                            collections.add(LibraryCollection(trimmed.lowercase(), trimmed))
                            onCreatePlaylist?.invoke(trimmed)
                            newPlaylistName = ""
                            showCreateDialog = false
                        }
                    }
                ) {
                    Text("Create", color = Color(0xFF22D3EE), fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showCreateDialog = false }) {
                    Text("Cancel", color = Color(0xFFA1A1A6))
                }
            },
            containerColor = Color(0xFF1C1E28),
            shape = RoundedCornerShape(24.dp)
        )
    }
}
