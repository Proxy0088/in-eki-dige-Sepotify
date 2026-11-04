package com.music.app.core.model

import androidx.compose.ui.graphics.Color

enum class MoodType(val displayName: String) {
    FEELS_GOOD("Feels good"),
    GAMING("Gaming"),
    CHILL("Chill"),
    FOCUS("Focus")
}

data class Track(
    val id: String,
    val title: String,
    val artist: String,
    val album: String = "",
    val duration: Int = 180, // duration in seconds
    val url: String = "",
    val coverUrl: String? = null,
    val gradientColors: List<Color> = listOf(Color(0xFFE65100), Color(0xFFF57C00), Color(0xFF263238)),
    val mood: MoodType = MoodType.CHILL,
    val isLiked: Boolean = false,
    val isDownloaded: Boolean = false,
    val collection: String = "recents",
    val dateAdded: Long = System.currentTimeMillis(),
    val isNationalNet: Boolean = false
) {
    val durationFormatted: String
        get() {
            val mins = duration / 60
            val secs = duration % 60
            return "%d:%02d".format(mins, secs)
        }
}

data class Playlist(
    val id: String,
    val name: String,
    val nameFa: String = name,
    val gradientColors: List<Color>,
    val borderColor: Color = Color.White.copy(alpha = 0.2f)
)

data class AlbumItem(
    val id: String,
    val name: String,
    val artist: String,
    val coverUrl: String?,
    val gradientColors: List<Color>,
    val tracks: List<Track>
)
