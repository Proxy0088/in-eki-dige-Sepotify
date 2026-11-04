package com.music.app.features.home

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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.outlined.Album
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.music.app.core.designsystem.components.MusicRow
import com.music.app.core.designsystem.theme.AudexFontFamily
import com.music.app.core.model.SAMPLE_PLAYLISTS
import com.music.app.core.model.Track

@Composable
fun HomeScreen(
    tracks: List<Track>,
    currentTrack: Track?,
    isPlaying: Boolean,
    onPlayTrack: (Track) -> Unit,
    onToggleLike: (Track) -> Unit,
    onToggleDownload: (Track) -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedGenre by remember { mutableStateOf<String?>(null) }
    var sortMode by remember { mutableStateOf("recent") } // "recent" or "popular"
    var showSortMenu by remember { mutableStateOf(false) }

    val featuredTrack = currentTrack ?: tracks.firstOrNull()

    // Filter tracks based on genre and sort
    val filteredTracks = remember(tracks, selectedGenre, sortMode) {
        var list = tracks
        if (selectedGenre != null) {
            val genreLower = selectedGenre!!.lowercase()
            list = list.filter {
                it.album.lowercase().contains(genreLower) ||
                it.title.lowercase().contains(genreLower) ||
                it.mood.displayName.lowercase().contains(genreLower)
            }
        }
        if (sortMode == "popular") {
            list = list.sortedByDescending { it.duration }
        }
        list
    }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(top = 130.dp, bottom = 160.dp, start = 16.dp, end = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // ── 1. Featured / Frequently Played Hero Card ──
        if (featuredTrack != null) {
            item(key = "hero_card") {
                val heroShape = RoundedCornerShape(28.dp)
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp)
                        .clip(heroShape)
                        .background(
                            brush = Brush.linearGradient(
                                colors = listOf(Color(0xFF450A0A), Color(0xFF24162A), Color(0xFF12141C))
                            )
                        )
                        .border(1.dp, Color.White.copy(alpha = 0.08f), heroShape)
                        .clickable { onPlayTrack(featuredTrack) }
                ) {
                    // Artwork with dark gradient overlay
                    if (!featuredTrack.coverUrl.isNullOrEmpty()) {
                        AsyncImage(
                            model = featuredTrack.coverUrl,
                            contentDescription = featuredTrack.title,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                    }

                    // Cinematic Gradient Overlay
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                brush = Brush.verticalGradient(
                                    colors = listOf(
                                        Color.Black.copy(alpha = 0.25f),
                                        Color.Black.copy(alpha = 0.55f),
                                        Color.Black.copy(alpha = 0.95f)
                                    )
                                )
                            )
                    )

                    // Top-right glass play/pause button
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(16.dp)
                            .size(42.dp)
                            .clip(CircleShape)
                            .background(Color.Black.copy(alpha = 0.6f))
                            .border(1.dp, Color.White.copy(alpha = 0.25f), CircleShape)
                            .clickable { onPlayTrack(featuredTrack) },
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (isPlaying && currentTrack?.id == featuredTrack.id) Icons.Default.Pause else Icons.Default.PlayArrow,
                            contentDescription = "Play featured",
                            tint = Color.White,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    // Bottom info: Artist, Badge & Title
                    Column(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(start = 18.dp, bottom = 16.dp, end = 70.dp)
                    ) {
                        Text(
                            text = featuredTrack.artist,
                            fontFamily = AudexFontFamily,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = "FREQUENTLY PLAYED",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp,
                                color = Color.White.copy(alpha = 0.75f)
                            )
                            Text(
                                text = "•",
                                fontSize = 10.sp,
                                color = Color.White.copy(alpha = 0.5f)
                            )
                            Text(
                                text = featuredTrack.title,
                                fontSize = 11.sp,
                                color = Color.White.copy(alpha = 0.9f),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
            }
        }

        // ── 2. Albums Section ──
        item(key = "albums_section") {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "Albums",
                            fontFamily = AudexFontFamily,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFEDEDED)
                        )
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.6f))
                        )
                    }

                    Icon(
                        imageVector = Icons.Default.ChevronRight,
                        contentDescription = "Browse albums",
                        tint = Color(0xFFA1A1A6),
                        modifier = Modifier.size(20.dp)
                    )
                }

                // Horizontal Album Cards
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(tracks.take(8), key = { "album-${it.id}" }) { track ->
                        val albumCardShape = RoundedCornerShape(18.dp)
                        Column(
                            modifier = Modifier
                                .width(130.dp)
                                .clickable { onPlayTrack(track) }
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(130.dp)
                                    .clip(albumCardShape)
                                    .background(
                                        brush = Brush.linearGradient(track.gradientColors)
                                    )
                                    .border(1.dp, Color.White.copy(alpha = 0.1f), albumCardShape),
                                contentAlignment = Alignment.Center
                            ) {
                                var hasImg by remember(track.id) { mutableStateOf(false) }

                                if (!track.coverUrl.isNullOrEmpty()) {
                                    AsyncImage(
                                        model = track.coverUrl,
                                        contentDescription = track.album,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier.fillMaxSize(),
                                        onSuccess = { hasImg = true },
                                        onError = { hasImg = false }
                                    )
                                }

                                if (!hasImg) {
                                    Icon(
                                        imageVector = Icons.Outlined.Album,
                                        contentDescription = null,
                                        tint = Color.White.copy(alpha = 0.8f),
                                        modifier = Modifier.size(36.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(6.dp))

                            Text(
                                text = track.album.ifEmpty { track.title },
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color(0xFFEDEDED),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = track.artist,
                                fontSize = 11.sp,
                                color = Color(0xFFA1A1A6),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
            }
        }

        // ── 3. Playlists / Genres Section ──
        item(key = "playlists_section") {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "Playlists",
                            fontFamily = AudexFontFamily,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFEDEDED)
                        )
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.6f))
                        )
                    }

                    if (selectedGenre != null) {
                        Text(
                            text = "Show all",
                            fontSize = 12.sp,
                            color = Color(0xFF22D3EE),
                            modifier = Modifier.clickable { selectedGenre = null }
                        )
                    }
                }

                // Horizontal Playlist Chips
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(SAMPLE_PLAYLISTS, key = { it.id }) { pl ->
                        val isSelected = selectedGenre == pl.name
                        val cardShape = RoundedCornerShape(16.dp)
                        Box(
                            modifier = Modifier
                                .size(width = 116.dp, height = 72.dp)
                                .clip(cardShape)
                                .background(brush = Brush.linearGradient(pl.gradientColors))
                                .border(
                                    width = if (isSelected) 2.dp else 1.dp,
                                    color = if (isSelected) Color.White else pl.borderColor,
                                    shape = cardShape
                                )
                                .clickable {
                                    selectedGenre = if (isSelected) null else pl.name
                                }
                                .padding(10.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = pl.name,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                }
            }
        }

        // ── 4. Songs Header & Sort Dropdown ──
        item(key = "songs_header") {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 4.dp, vertical = 2.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = "Songs",
                        fontFamily = AudexFontFamily,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFEDEDED)
                    )
                    if (selectedGenre != null) {
                        Text(
                            text = "($selectedGenre)",
                            fontSize = 12.sp,
                            color = Color(0xFF22D3EE)
                        )
                    }
                }

                Box {
                    Box(
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.08f))
                            .border(1.dp, Color.White.copy(alpha = 0.12f), CircleShape)
                            .clickable { showSortMenu = true }
                            .padding(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Text(
                            text = if (sortMode == "recent") "Recent ▾" else "Popular ▾",
                            fontSize = 12.sp,
                            color = Color(0xFFA1A1A6)
                        )
                    }

                    DropdownMenu(
                        expanded = showSortMenu,
                        onDismissRequest = { showSortMenu = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("🕒 Recent") },
                            onClick = {
                                sortMode = "recent"
                                showSortMenu = false
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("🔥 Popular") },
                            onClick = {
                                sortMode = "popular"
                                showSortMenu = false
                            }
                        )
                    }
                }
            }
        }

        // Pinned Now Playing Row (if currentTrack exists)
        if (currentTrack != null) {
            item(key = "now_playing_pinned") {
                val pinnedShape = RoundedCornerShape(16.dp)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(pinnedShape)
                        .background(Color(0xFF181D28))
                        .border(1.dp, Color(0xFF22D3EE).copy(alpha = 0.3f), pinnedShape)
                        .clickable { onPlayTrack(currentTrack) }
                        .padding(10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        modifier = Modifier.weight(1f),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(
                                    brush = Brush.linearGradient(currentTrack.gradientColors)
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            var hasTrackImg by remember(currentTrack.id) { mutableStateOf(false) }

                            if (!currentTrack.coverUrl.isNullOrEmpty()) {
                                AsyncImage(
                                    model = currentTrack.coverUrl,
                                    contentDescription = currentTrack.title,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize(),
                                    onSuccess = { hasTrackImg = true },
                                    onError = { hasTrackImg = false }
                                )
                            }

                            if (!hasTrackImg) {
                                Icon(
                                    imageVector = Icons.Default.MusicNote,
                                    contentDescription = null,
                                    tint = Color.White.copy(alpha = 0.9f),
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(6.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFF22D3EE))
                                )
                                Text(
                                    text = "NOW PLAYING",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF22D3EE),
                                    letterSpacing = 0.5.sp
                                )
                            }
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = currentTrack.title,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color(0xFFEDEDED),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = currentTrack.artist,
                                fontSize = 12.sp,
                                color = Color(0xFFA1A1A6),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }

                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF22D3EE).copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                            contentDescription = "Play/Pause",
                            tint = Color(0xFF22D3EE),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }
        }

        // ── 5. Fully Virtualized Song Items (Zero Main Thread Lock / Butter Smooth) ──
        items(
            items = filteredTracks,
            key = { it.id }
        ) { track ->
            MusicRow(
                track = track,
                isPlaying = isPlaying,
                isCurrent = currentTrack?.id == track.id,
                onPlay = onPlayTrack,
                onToggleLike = onToggleLike,
                onToggleDownload = onToggleDownload
            )
        }
    }
}
