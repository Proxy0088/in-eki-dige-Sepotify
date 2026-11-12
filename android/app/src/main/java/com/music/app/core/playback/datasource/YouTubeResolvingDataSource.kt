package com.music.app.core.playback.datasource

import android.net.Uri
import android.util.Log
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DataSpec
import androidx.media3.datasource.HttpDataSource
import androidx.media3.datasource.TransferListener
import java.io.IOException

@UnstableApi
class YouTubeResolvingDataSource(
    private val upstreamDataSource: DataSource,
    private val resolver: YouTubeStreamUrlResolver
) : DataSource {

    companion object {
        private const val TAG = "YouTubeResolvingDS"
    }

    private var currentDataSpec: DataSpec? = null

    override fun addTransferListener(transferListener: TransferListener) {
        upstreamDataSource.addTransferListener(transferListener)
    }

    @Throws(IOException::class)
    override fun open(dataSpec: DataSpec): Long {
        currentDataSpec = dataSpec
        val uri = dataSpec.uri

        // Non-resolving URIs (local files, content://, MusicDel/HTTP) pass directly upstream
        if (uri.scheme != "yt" && uri.scheme != "itunes") {
            return upstreamDataSource.open(dataSpec)
        }

        val identifier = if (uri.scheme == "itunes") {
            uri.toString().removePrefix("itunes://")
        } else {
            uri.schemeSpecificPart.removePrefix("//").trim()
        }
        if (identifier.isEmpty()) {
            throw IOException("Invalid identifier in URI: $uri")
        }

        // Attempt 1: resolve cached or fresh stream URL
        var directUrl = resolver.resolve(identifier, forceRefresh = false)
            ?: throw IOException("Unable to resolve audio stream for: $identifier")

        Log.i(TAG, "Opening stream for $identifier: ${directUrl.take(60)}...")
        var resolvedDataSpec = dataSpec.buildUpon().setUri(Uri.parse(directUrl)).build()

        return try {
            upstreamDataSource.open(resolvedDataSpec)
        } catch (e: Exception) {
            val isRetryable = when (e) {
                is HttpDataSource.InvalidResponseCodeException -> e.responseCode in listOf(403, 410, 429, 500, 502, 503)
                is HttpDataSource.HttpDataSourceException -> true
                is IOException -> true
                else -> false
            }

            if (isRetryable) {
                Log.w(TAG, "Stream open failed for $identifier (${e.message}), attempting force refresh (retry 1)...")
                // Attempt 2: Force refresh once
                try {
                    upstreamDataSource.close()
                } catch (_: Exception) {}

                directUrl = resolver.resolve(identifier, forceRefresh = true)
                    ?: throw (if (e is IOException) e else IOException(e))

                resolvedDataSpec = dataSpec.buildUpon().setUri(Uri.parse(directUrl)).build()
                try {
                    upstreamDataSource.open(resolvedDataSpec)
                } catch (e2: Exception) {
                    Log.w(TAG, "Stream retry 1 also failed for $identifier (${e2.message}), attempting final retry...")
                    // Attempt 3: Force refresh one more time with a short pause
                    try {
                        upstreamDataSource.close()
                    } catch (_: Exception) {}
                    Thread.sleep(2000)

                    directUrl = resolver.resolve(identifier, forceRefresh = true)
                        ?: throw (if (e2 is IOException) e2 else IOException(e2))

                    resolvedDataSpec = dataSpec.buildUpon().setUri(Uri.parse(directUrl)).build()
                    upstreamDataSource.open(resolvedDataSpec)
                }
            } else {
                if (e is IOException) throw e else throw IOException(e)
            }
        }
    }

    @Throws(IOException::class)
    override fun read(buffer: ByteArray, offset: Int, length: Int): Int {
        return upstreamDataSource.read(buffer, offset, length)
    }

    override fun getUri(): Uri? {
        return upstreamDataSource.uri ?: currentDataSpec?.uri
    }

    override fun getResponseHeaders(): Map<String, List<String>> {
        return upstreamDataSource.responseHeaders
    }

    @Throws(IOException::class)
    override fun close() {
        currentDataSpec = null
        upstreamDataSource.close()
    }
}
