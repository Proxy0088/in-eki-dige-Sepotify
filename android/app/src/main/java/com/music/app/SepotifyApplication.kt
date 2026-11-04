package com.music.app

import android.app.Application
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.disk.DiskCache
import coil.memory.MemoryCache
import com.music.app.core.media.AudioCoverFetcher
import com.music.app.core.network.newpipe.NewPipeOkHttpDownloader
import org.schabi.newpipe.extractor.NewPipe

class SepotifyApplication : Application(), ImageLoaderFactory {

    override fun onCreate() {
        super.onCreate()
        // Initialize NewPipeExtractor with custom OkHttp Downloader once at startup
        NewPipe.init(NewPipeOkHttpDownloader.getInstance())
    }

    override fun newImageLoader(): ImageLoader {
        return ImageLoader.Builder(this)
            .memoryCache {
                MemoryCache.Builder(this)
                    .maxSizePercent(0.25)
                    .build()
            }
            .diskCache {
                DiskCache.Builder()
                    .directory(cacheDir.resolve("image_cache"))
                    .maxSizePercent(0.02)
                    .build()
            }
            .components {
                add(AudioCoverFetcher.Factory(this@SepotifyApplication))
            }
            .crossfade(true)
            .build()
    }
}
