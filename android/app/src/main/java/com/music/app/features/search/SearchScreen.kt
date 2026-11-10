package com.music.app.features.search

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
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
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.rounded.CloudOff
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.music.app.core.designsystem.components.MusicRow
import com.music.app.core.model.MoodType
import com.music.app.core.model.Track
import com.music.app.core.network.OnlineMusicService
import androidx.compose.material.icons.filled.History
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.isActive

private val CATEGORY_CHIPS = listOf("All", "Ambient", "Electronic", "Pop", "Rock", "Classical", "Lo-Fi")

enum class SearchMode {
    ONLINE,
    LOCAL,
    NATIONAL_NET
}

@Composable
fun SearchScreen(
    tracks: List<Track>,
    currentTrack: Track?,
    isPlaying: Boolean,
    onPlayTrack: (Track, List<Track>) -> Unit,
    onToggleLike: (Track) -> Unit,
    onToggleDownload: (Track) -> Unit,
    onAddToPlaylist: ((Track) -> Unit)? = null,
    recentSearches: List<String> = emptyList(),
    onSaveSearchQuery: ((String) -> Unit)? = null,
    onRemoveRecentSearch: ((String) -> Unit)? = null,
    onClearRecentSearches: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    var query by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("All") }
    var searchMode by remember { mutableStateOf(SearchMode.ONLINE) }
    var retryTrigger by remember { mutableIntStateOf(0) }

    var isSearching by remember { mutableStateOf(false) }
    var searchError by remember { mutableStateOf<String?>(null) }
    var onlineResults by remember { mutableStateOf<List<Track>>(emptyList()) }

    // ── Debounced Online Search (350ms) ──
    LaunchedEffect(query, searchMode, retryTrigger) {
        if (searchMode == SearchMode.LOCAL) {
            isSearching = false
            searchError = null
            return@LaunchedEffect
        }

        val trimmed = query.trim()
        if (trimmed.isEmpty()) {
            onlineResults = emptyList()
            isSearching = false
            searchError = null
            return@LaunchedEffect
        }

        isSearching = true
        searchError = null
        kotlinx.coroutines.delay(350)

        android.util.Log.e("SearchScreen", "Triggering OnlineMusicService.search('$trimmed', mode=$searchMode)")
        try {
            val results = OnlineMusicService.search(trimmed, searchMode == SearchMode.NATIONAL_NET)
            onlineResults = results
            searchError = null
            if (results.isNotEmpty()) {
                onSaveSearchQuery?.invoke(trimmed)
            }
            android.util.Log.e("SearchScreen", "Search returned ${results.size} tracks")
        } catch (e: CancellationException) {
            // Rethrow coroutine cancellation so typing does NOT set an error state
            throw e
        } catch (e: Exception) {
            android.util.Log.e("SearchScreen", "Search exception", e)
            searchError = e.message ?: "Unable to load search results"
            onlineResults = emptyList()
        } finally {
            if (currentCoroutineContext().isActive) {
                isSearching = false
            }
        }
    }

    // Filtered tracks to display
    val displayTracks = remember(tracks, onlineResults, query, selectedCategory, searchMode) {
        val baseList = when (searchMode) {
            SearchMode.LOCAL -> {
                val downloaded = tracks.filter { it.isDownloaded }
                if (query.isNotBlank()) {
                    val q = query.trim().lowercase()
                    downloaded.filter {
                        it.title.lowercase().contains(q) ||
                        it.artist.lowercase().contains(q) ||
                        it.album.lowercase().contains(q)
                    }
                } else {
                    downloaded
                }
            }
            SearchMode.ONLINE, SearchMode.NATIONAL_NET -> {
                if (query.isNotBlank()) {
                    onlineResults
                } else {
                    // Default online suggestions when query is empty
                    if (searchMode == SearchMode.NATIONAL_NET) {
                        OnlineMusicService.VERIFIED_IRAN_TRACKS
                    } else {
                        tracks.take(10)
                    }
                }
            }
        }

        if (selectedCategory != "All") {
            val catLower = selectedCategory.lowercase()
            baseList.filter { track ->
                track.mood.displayName.lowercase().contains(catLower) ||
                track.album.lowercase().contains(catLower) ||
                track.title.lowercase().contains(catLower) ||
                track.artist.lowercase().contains(catLower) ||
                when (catLower) {
                    "ambient" -> track.mood == MoodType.CHILL || track.mood == MoodType.FOCUS
                    "electronic" -> track.mood == MoodType.GAMING
                    "pop" -> track.mood == MoodType.FEELS_GOOD
                    "lo-fi", "lofi" -> track.mood == MoodType.CHILL
                    "classical" -> track.mood == MoodType.FOCUS
                    "rock" -> track.mood == MoodType.GAMING
                    else -> false
                }
            }
        } else {
            baseList
        }
    }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(top = 130.dp, bottom = 175.dp, start = 16.dp, end = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // ── Pinned Search Controls ──
        item(key = "search_controls") {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                // Glass Search Input Capsule
                val capsuleShape = RoundedCornerShape(24.dp)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                        .clip(capsuleShape)
                        .background(Color(0xFF161822).copy(alpha = 0.85f))
                        .border(1.dp, Color.White.copy(alpha = 0.12f), capsuleShape)
                        .padding(horizontal = 14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = "Search",
                        tint = Color(0xFF71717A),
                        modifier = Modifier.size(18.dp)
                    )

                    Spacer(modifier = Modifier.width(10.dp))

                    Box(modifier = Modifier.weight(1f)) {
                        if (query.isEmpty()) {
                            Text(
                                text = when (searchMode) {
                                    SearchMode.LOCAL -> "Search local & downloaded files..."
                                    SearchMode.NATIONAL_NET -> "Search National Net catalog..."
                                    SearchMode.ONLINE -> "Search songs, artists, albums..."
                                },
                                fontSize = 13.sp,
                                color = Color(0xFF71717A)
                            )
                        }
                        BasicTextField(
                            value = query,
                            onValueChange = { query = it },
                            textStyle = TextStyle(
                                color = Color(0xFFEDEDED),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Normal
                            ),
                            cursorBrush = SolidColor(Color(0xFF22D3EE)),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    if (query.isNotEmpty()) {
                        IconButton(
                            onClick = { query = "" },
                            modifier = Modifier.size(28.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Clear",
                                tint = Color(0xFFA1A1A6),
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }

                    // Mode Toggle Icon with tactile bounce
                    val toggleInteraction = remember { MutableInteractionSource() }
                    val isTogglePressed by toggleInteraction.collectIsPressedAsState()
                    val toggleScale by animateFloatAsState(
                        targetValue = if (isTogglePressed) 0.85f else 1f,
                        animationSpec = spring(stiffness = Spring.StiffnessMedium, dampingRatio = 0.6f),
                        label = "toggle_scale"
                    )

                    IconButton(
                        onClick = {
                            searchMode = when (searchMode) {
                                SearchMode.ONLINE -> SearchMode.NATIONAL_NET
                                SearchMode.NATIONAL_NET -> SearchMode.LOCAL
                                SearchMode.LOCAL -> SearchMode.ONLINE
                            }
                        },
                        interactionSource = toggleInteraction,
                        modifier = Modifier
                            .size(32.dp)
                            .graphicsLayer {
                                scaleX = toggleScale
                                scaleY = toggleScale
                            }
                    ) {
                        when (searchMode) {
                            SearchMode.ONLINE -> Icon(
                                imageVector = Icons.Default.Language,
                                contentDescription = "Online",
                                tint = Color(0xFFA1A1A6),
                                modifier = Modifier.size(18.dp)
                            )
                            SearchMode.NATIONAL_NET -> Icon(
                                imageVector = Icons.Default.Security,
                                contentDescription = "National Net",
                                tint = Color(0xFF34D399),
                                modifier = Modifier.size(18.dp)
                            )
                            SearchMode.LOCAL -> Icon(
                                imageVector = Icons.Default.Folder,
                                contentDescription = "Local",
                                tint = Color(0xFF22D3EE),
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }

                // ── Animated Category Chips ──
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(CATEGORY_CHIPS) { cat ->
                        val isSelected = selectedCategory == cat
                        val chipInteraction = remember { MutableInteractionSource() }
                        val isChipPressed by chipInteraction.collectIsPressedAsState()

                        val chipScale by animateFloatAsState(
                            targetValue = if (isChipPressed) 0.92f else 1f,
                            animationSpec = spring(stiffness = Spring.StiffnessMedium, dampingRatio = 0.65f),
                            label = "chip_scale"
                        )

                        val bg by animateColorAsState(
                            targetValue = if (isSelected) Color.White.copy(alpha = 0.22f) else Color.White.copy(alpha = 0.05f),
                            animationSpec = spring(stiffness = Spring.StiffnessMedium),
                            label = "chip_bg"
                        )
                        val border by animateColorAsState(
                            targetValue = if (isSelected) Color.White.copy(alpha = 0.35f) else Color.White.copy(alpha = 0.08f),
                            animationSpec = spring(stiffness = Spring.StiffnessMedium),
                            label = "chip_border"
                        )

                        Box(
                            modifier = Modifier
                                .graphicsLayer {
                                    scaleX = chipScale
                                    scaleY = chipScale
                                }
                                .clip(CircleShape)
                                .background(bg)
                                .border(1.dp, border, CircleShape)
                                .clickable(
                                    interactionSource = chipInteraction,
                                    indication = null,
                                    onClick = {
                                        selectedCategory = if (selectedCategory == cat) "All" else cat
                                    }
                                )
                                .padding(horizontal = 14.dp, vertical = 7.dp)
                        ) {
                            Text(
                                text = cat,
                                fontSize = 12.sp,
                                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                                color = if (isSelected) Color.White else Color(0xFFA1A1A6)
                            )
                        }
                    }
                }
            }
        }

        // ── Search State (Loading / Results / Error / Empty) ──
        if (query.isEmpty() && recentSearches.isNotEmpty()) {
            item(key = "recent_searches_section") {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 4.dp, vertical = 6.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.History,
                                contentDescription = null,
                                tint = Color(0xFF22D3EE),
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Recent Searches",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color(0xFFEDEDED)
                            )
                        }

                        if (onClearRecentSearches != null) {
                            Text(
                                text = "Clear",
                                fontSize = 12.sp,
                                color = Color(0xFF22D3EE),
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .clickable { onClearRecentSearches() }
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        items(recentSearches) { q ->
                            Row(
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .background(Color.White.copy(alpha = 0.08f))
                                    .border(1.dp, Color.White.copy(alpha = 0.12f), CircleShape)
                                    .clickable { query = q }
                                    .padding(start = 12.dp, end = 8.dp, top = 6.dp, bottom = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = q,
                                    fontSize = 12.sp,
                                    color = Color(0xFFEDEDED)
                                )
                                if (onRemoveRecentSearch != null) {
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Icon(
                                        imageVector = Icons.Default.Close,
                                        contentDescription = "Remove",
                                        tint = Color(0xFFA1A1A6),
                                        modifier = Modifier
                                            .size(14.dp)
                                            .clickable { onRemoveRecentSearch(q) }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        if (isSearching && displayTracks.isEmpty()) {
            item(key = "loading_search") {
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
                    CircularProgressIndicator(
                        modifier = Modifier.size(28.dp),
                        color = Color(0xFF22D3EE),
                        strokeWidth = 2.5.dp
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "Searching online music...",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFFA1A1A6)
                    )
                }
            }
        } else if (!isSearching && searchError != null && displayTracks.isEmpty()) {
            item(key = "error_search") {
                val containerShape = RoundedCornerShape(24.dp)
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(containerShape)
                        .background(Color(0xFF14161F))
                        .border(1.dp, Color(0xFFEF4444).copy(alpha = 0.25f), containerShape)
                        .padding(horizontal = 24.dp, vertical = 36.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Rounded.CloudOff,
                        contentDescription = "Search Error",
                        tint = Color(0xFFEF4444).copy(alpha = 0.85f),
                        modifier = Modifier.size(36.dp)
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = "Search Error",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFFEDEDED)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = searchError ?: "Search failed or network request was blocked",
                        fontSize = 12.sp,
                        color = Color(0xFFA1A1A6),
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Box(
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.12f))
                            .border(1.dp, Color.White.copy(alpha = 0.25f), CircleShape)
                            .clickable { retryTrigger++ }
                            .padding(horizontal = 20.dp, vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Retry",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color.White
                        )
                    }
                }
            }
        } else if (displayTracks.isNotEmpty()) {
            items(
                items = displayTracks,
                key = { it.id }
            ) { track ->
                MusicRow(
                    track = track,
                    isPlaying = isPlaying,
                    isCurrent = currentTrack?.id == track.id,
                    onPlay = { selected -> onPlayTrack(selected, displayTracks) },
                    onToggleLike = { onAddToPlaylist?.invoke(it) ?: onToggleLike(it) },
                    onToggleDownload = onToggleDownload,
                    onMoreClick = onAddToPlaylist
                )
            }
        } else {
            item(key = "empty_search") {
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
                        imageVector = Icons.Outlined.AutoAwesome,
                        contentDescription = null,
                        tint = Color(0xFF71717A).copy(alpha = 0.4f),
                        modifier = Modifier.size(32.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = if (query.isNotBlank()) "No tracks found for \"${query.trim()}\"" else "Search songs, artists, or albums",
                        fontSize = 13.sp,
                        color = Color(0xFF71717A)
                    )
                }
            }
        }
    }
}
