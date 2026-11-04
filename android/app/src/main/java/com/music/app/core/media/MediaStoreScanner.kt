package com.music.app.core.media

import android.content.ContentUris
import android.content.Context
import android.net.Uri
import android.provider.MediaStore
import androidx.compose.ui.graphics.Color
import com.music.app.core.model.MoodType
import com.music.app.core.model.Track
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object MediaStoreScanner {

    private val ALBUM_ART_URI = Uri.parse("content://media/external/audio/albumart")

    suspend fun scanDeviceAudio(context: Context): List<Track> = withContext(Dispatchers.IO) {
        val tracks = mutableListOf<Track>()

        val projection = arrayOf(
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.ALBUM_ID,
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
                val albumIdCol = it.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)
                val dateAddedCol = it.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_ADDED)

                while (it.moveToNext()) {
                    val id = it.getLong(idCol)
                    val title = it.getString(titleCol) ?: "Unknown Track"
                    val artist = it.getString(artistCol) ?: "Unknown Artist"
                    val album = it.getString(albumCol) ?: "Device Audio"
                    val durationMs = it.getLong(durationCol)
                    val albumId = it.getLong(albumIdCol)
                    val dateAdded = it.getLong(dateAddedCol)

                    val contentUri = ContentUris.withAppendedId(
                        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                        id
                    )

                    val artworkUri = ContentUris.withAppendedId(ALBUM_ART_URI, albumId).toString()

                    val gradient = listOf(
                        Color(0xFF1E88E5),
                        Color(0xFF0D47A1),
                        Color(0xFF1A237E)
                    )

                    tracks.add(
                        Track(
                            id = "device-$id",
                            title = title,
                            artist = if (artist.equals("<unknown>", ignoreCase = true)) "Local Device" else artist,
                            album = album,
                            duration = (durationMs / 1000).toInt(),
                            url = contentUri.toString(),
                            coverUrl = artworkUri,
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
