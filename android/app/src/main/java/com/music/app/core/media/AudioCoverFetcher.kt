package com.music.app.core.media

import android.content.ContentResolver
import android.content.Context
import android.graphics.BitmapFactory
import android.graphics.drawable.BitmapDrawable
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.util.Size
import coil.ImageLoader
import coil.decode.DataSource
import coil.fetch.DrawableResult
import coil.fetch.FetchResult
import coil.fetch.Fetcher
import coil.request.Options
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * High-performance Coil Fetcher for local device audio artwork.
 * 1. Uses Android Q+ (API 29+) hardware-accelerated MediaStore thumbnail cache.
 * 2. Falls back to direct ID3 APIC frame extraction via MediaMetadataRetriever.
 * 3. Results are cached in Coil's in-memory Bitmap LRU cache for 120 FPS scrolling.
 */
class AudioCoverFetcher(
    private val context: Context,
    private val uri: Uri
) : Fetcher {

    override suspend fun fetch(): FetchResult? = withContext(Dispatchers.IO) {
        if (uri.scheme != ContentResolver.SCHEME_CONTENT) return@withContext null

        // 1. Android Q+ (API 29+) native MediaStore thumbnail
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            try {
                val bitmap = context.contentResolver.loadThumbnail(uri, Size(300, 300), null)
                return@withContext DrawableResult(
                    drawable = BitmapDrawable(context.resources, bitmap),
                    isSampled = false,
                    dataSource = DataSource.DISK
                )
            } catch (_: Exception) {
                // Not in thumbnail cache, try MediaMetadataRetriever
            }
        }

        // 2. Direct embedded picture extraction via MediaMetadataRetriever
        try {
            val retriever = MediaMetadataRetriever()
            retriever.setDataSource(context, uri)
            val picture = retriever.embeddedPicture
            retriever.release()

            if (picture != null) {
                val bitmap = BitmapFactory.decodeByteArray(picture, 0, picture.size)
                if (bitmap != null) {
                    return@withContext DrawableResult(
                        drawable = BitmapDrawable(context.resources, bitmap),
                        isSampled = false,
                        dataSource = DataSource.DISK
                    )
                }
            }
        } catch (_: Exception) {
            // No embedded art
        }

        null
    }

    class Factory(private val context: Context) : Fetcher.Factory<Uri> {
        override fun create(data: Uri, options: Options, imageLoader: ImageLoader): Fetcher? {
            val uriStr = data.toString()
            if (uriStr.startsWith("content://media/external/audio/media/")) {
                return AudioCoverFetcher(context, data)
            }
            return null
        }
    }
}
