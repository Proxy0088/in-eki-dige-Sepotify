package com.music.app.core.playback

import android.app.PendingIntent
import android.content.Intent
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import com.music.app.MainActivity
import com.music.app.core.network.newpipe.StreamResolver
import com.music.app.core.playback.datasource.YouTubeDataSourceFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import okhttp3.OkHttpClient
import java.net.InetAddress
import java.util.concurrent.TimeUnit

class PlaybackService : MediaSessionService() {

    private var player: ExoPlayer? = null
    private var mediaSession: MediaSession? = null

    @OptIn(UnstableApi::class)
    override fun onCreate() {
        super.onCreate()

        val audioAttributes = AudioAttributes.Builder()
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .setUsage(C.USAGE_MEDIA)
            .build()

        // Build an OkHttp-backed HTTP data source with reliable DNS for actual audio streaming
        val reliableDns = object : okhttp3.Dns {
            override fun lookup(hostname: String): List<InetAddress> {
                try {
                    val systemResult = okhttp3.Dns.SYSTEM.lookup(hostname)
                    if (systemResult.isNotEmpty()) return systemResult
                } catch (_: Exception) {}

                try {
                    val url = "https://dns.google/resolve?name=$hostname&type=A"
                    val req = okhttp3.Request.Builder().url(url)
                        .header("Accept", "application/dns-json")
                        .build()
                    val fallbackClient = OkHttpClient.Builder()
                        .connectTimeout(5, TimeUnit.SECONDS)
                        .readTimeout(5, TimeUnit.SECONDS)
                        .build()
                    val resp = fallbackClient.newCall(req).execute()
                    val body = resp.body?.string() ?: ""
                    resp.close()
                    val json = org.json.JSONObject(body)
                    val answers = json.optJSONArray("Answer")
                    if (answers != null && answers.length() > 0) {
                        val ips = mutableListOf<InetAddress>()
                        for (i in 0 until answers.length()) {
                            val data = answers.optJSONObject(i)?.optString("data") ?: continue
                            try { ips.add(InetAddress.getByName(data)) } catch (_: Exception) {}
                        }
                        if (ips.isNotEmpty()) return ips
                    }
                } catch (_: Exception) {}

                return InetAddress.getAllByName(hostname).toList()
            }
        }

        val okHttpClient = OkHttpClient.Builder()
            .dns(reliableDns)
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .build()

        val httpDataSourceFactory = DefaultHttpDataSource.Factory()
            .setConnectTimeoutMs(20_000)
            .setReadTimeoutMs(30_000)
            .setAllowCrossProtocolRedirects(true)
            .setUserAgent("Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36")

        val upstreamFactory = DefaultDataSource.Factory(this, httpDataSourceFactory)
        val youtubeDataSourceFactory = YouTubeDataSourceFactory(
            upstreamFactory = upstreamFactory,
            resolver = { videoId, forceRefresh ->
                runBlocking(Dispatchers.IO) {
                    StreamResolver.resolveStreamUrl(videoId, forceRefresh)
                }
            }
        )

        val mediaSourceFactory = DefaultMediaSourceFactory(this)
            .setDataSourceFactory(youtubeDataSourceFactory)

        val exoPlayer = ExoPlayer.Builder(this)
            .setMediaSourceFactory(mediaSourceFactory)
            .setAudioAttributes(audioAttributes, true)
            .setHandleAudioBecomingNoisy(true)
            .setWakeMode(C.WAKE_MODE_LOCAL)
            .build()

        player = exoPlayer

        val sessionActivityPendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        mediaSession = MediaSession.Builder(this, exoPlayer)
            .setSessionActivity(sessionActivityPendingIntent)
            .build()
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        return mediaSession
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        val player = player
        if (player != null && (!player.playWhenReady || player.mediaItemCount == 0)) {
            stopSelf()
        }
    }

    override fun onDestroy() {
        mediaSession?.run {
            player.release()
            release()
            mediaSession = null
        }
        player = null
        super.onDestroy()
    }
}
