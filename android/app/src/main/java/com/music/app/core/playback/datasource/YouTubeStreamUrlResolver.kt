package com.music.app.core.playback.datasource

import java.io.IOException

fun interface YouTubeStreamUrlResolver {
    @Throws(IOException::class)
    fun resolve(videoId: String, forceRefresh: Boolean): String?
}
