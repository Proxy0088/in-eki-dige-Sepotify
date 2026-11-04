package com.music.app.core.playback.datasource

import androidx.annotation.OptIn
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DataSource

@OptIn(UnstableApi::class)
class YouTubeDataSourceFactory(
    private val upstreamFactory: DataSource.Factory,
    private val resolver: YouTubeStreamUrlResolver
) : DataSource.Factory {

    override fun createDataSource(): DataSource {
        return YouTubeResolvingDataSource(upstreamFactory.createDataSource(), resolver)
    }
}
