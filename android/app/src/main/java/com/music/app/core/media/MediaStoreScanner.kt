package com.music.app.core.media

import android.content.ContentUris
import android.content.Context
import android.provider.MediaStore
import androidx.compose.ui.graphics.Color
import com.music.app.core.model.MoodType
import com.music.app.core.model.Track
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.math.abs

object MediaStoreScanner {

    private val PRESET_GRADIENTS = listOf(
        listOf(Color(0xFF22C55E), Color(0xFFA3E635), Color(0xFF14B8A6)), // Emerald / Lime
        listOf(Color(0xFFF59E0B), Color(0xFFFB923C), Color(0xFFEA580C)), // Amber / Orange
        listOf(Color(0xFF3B82F6), Color(0xFF6366F1), Color(0xFF0EA5E9)), // Sky / Indigo
        listOf(Color(0xFFA855F7), Color(0xFFEC4899), Color(0xFFC084FC)), // Purple / Pink
        listOf(Color(0xFF10B981), Color(0xFF34D399), Color(0xFF2DD4BF)), // Mint / Teal
        listOf(Color(0xFFEF4444), Color(0xFFF97316), Color(0xFFFBBF24))  // Coral / Sunset
    )

    private fun getPaletteForSeed(seed: String): List<Color> {
        val hash = seed.hashCode()
        val idx = abs(hash) % PRESET_GRADIENTS.size
        return PRESET_GRADIENTS[idx]
    }

    suspend fun scanDeviceAudio(context: Context): List<Track> = withContext(Dispatchers.IO) {
        val tracks = mutableListOf<Track>()

        val projection = arrayOf(
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.DATE_ADDED
        )

        val selection = "${MediaStore.Audio.Media.IS_MUSIC} != 0 AND ${MediaStore.Audio.Media.DURATION} >= 15000"
        val sortOrder = "${MediaStore.Audio.Media.DATE_ADDED} DESC"

        try {
            val cursor = context.contentResolver.query(
                MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                projection,
                selection,
                null,
                sortOrder
            )

            cursor?.use {
                val idCol = it.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
                val titleCol = it.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
                val artistCol = it.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
                val albumCol = it.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
                val durationCol = it.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
                val dateAddedCol = it.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_ADDED)

                while (it.moveToNext()) {
                    val id = it.getLong(idCol)
                    val title = it.getString(titleCol) ?: "Unknown Track"
                    val artist = it.getString(artistCol) ?: "Unknown Artist"
                    val album = it.getString(albumCol) ?: "Device Audio"
                    val durationMs = it.getLong(durationCol)
                    val dateAdded = it.getLong(dateAddedCol)

                    val contentUri = ContentUris.withAppendedId(
                        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                        id
                    )

                    val gradient = getPaletteForSeed("$title::$artist")

                    tracks.add(
                        Track(
                            id = "device-$id",
                            title = title,
                            artist = if (artist.equals("<unknown>", ignoreCase = true)) "Local Device" else artist,
                            album = album,
                            duration = (durationMs / 1000).toInt(),
                            url = contentUri.toString(),
                            coverUrl = null, // Safe null so Coil doesn't hammer broken albumart URIs
                            gradientColors = gradient,
                            mood = MoodType.CHILL,
                            isLiked = false,
                            isDownloaded = true,
                            collection = "downloads",
                            dateAdded = dateAdded,
                            isNationalNet = false
                        )
                    )
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        tracks
    }
}
