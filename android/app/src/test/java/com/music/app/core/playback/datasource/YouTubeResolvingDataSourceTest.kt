package com.music.app.core.playback.datasource

import android.net.Uri
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DataSpec
import androidx.media3.datasource.HttpDataSource
import androidx.media3.datasource.TransferListener
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.io.IOException

@UnstableApi
@RunWith(RobolectricTestRunner::class)
class YouTubeResolvingDataSourceTest {

    private class FakeUpstreamDataSource : DataSource {
        var openCallCount = 0
        var openedDataSpecs = mutableListOf<DataSpec>()
        var simulatedExceptionOnFirstOpen: IOException? = null

        override fun addTransferListener(transferListener: TransferListener) {}

        override fun open(dataSpec: DataSpec): Long {
            openCallCount++
            openedDataSpecs.add(dataSpec)
            if (openCallCount == 1 && simulatedExceptionOnFirstOpen != null) {
                throw simulatedExceptionOnFirstOpen!!
            }
            return 1024L
        }

        override fun read(buffer: ByteArray, offset: Int, length: Int): Int = -1
        override fun getUri(): Uri? = openedDataSpecs.lastOrNull()?.uri
        override fun getResponseHeaders(): Map<String, List<String>> = emptyMap()
        override fun close() {}
    }

    @Test
    fun testNonYouTubeUriBypassesResolver() {
        val fakeUpstream = FakeUpstreamDataSource()
        var resolverCalled = false

        val dataSource = YouTubeResolvingDataSource(fakeUpstream) { _, _ ->
            resolverCalled = true
            "https://not-called.com"
        }

        val localSpec = DataSpec(Uri.parse("content://media/external/audio/media/42"))
        val length = dataSource.open(localSpec)

        assertEquals(1024L, length)
        assertEquals(false, resolverCalled)
        assertEquals("content://media/external/audio/media/42", fakeUpstream.openedDataSpecs[0].uri.toString())
    }

    @Test
    fun testYouTubeUriResolvesDirectStream() {
        val fakeUpstream = FakeUpstreamDataSource()
        val resolverCalls = mutableListOf<Pair<String, Boolean>>()

        val dataSource = YouTubeResolvingDataSource(fakeUpstream) { videoId, forceRefresh ->
            resolverCalls.add(videoId to forceRefresh)
            "https://rr1---sn-audio.googlevideo.com/videoplayback?id=$videoId"
        }

        val ytSpec = DataSpec(Uri.parse("yt://dQw4w9WgXcQ"))
        val length = dataSource.open(ytSpec)

        assertEquals(1024L, length)
        assertEquals(1, resolverCalls.size)
        assertEquals("dQw4w9WgXcQ", resolverCalls[0].first)
        assertEquals(false, resolverCalls[0].second)
        assertEquals(
            "https://rr1---sn-audio.googlevideo.com/videoplayback?id=dQw4w9WgXcQ",
            fakeUpstream.openedDataSpecs[0].uri.toString()
        )
    }

    @Test
    fun testRetryOnHttp403Forbidden() {
        val fakeUpstream = FakeUpstreamDataSource()
        // Simulate HTTP 403 Forbidden on the first open call
        fakeUpstream.simulatedExceptionOnFirstOpen = HttpDataSource.InvalidResponseCodeException(
            403,
            "Forbidden",
            null,
            emptyMap(),
            DataSpec(Uri.parse("https://expired.googlevideo.com")),
            ByteArray(0)
        )

        val resolverCalls = mutableListOf<Pair<String, Boolean>>()

        val dataSource = YouTubeResolvingDataSource(fakeUpstream) { videoId, forceRefresh ->
            resolverCalls.add(videoId to forceRefresh)
            if (forceRefresh) {
                "https://fresh.googlevideo.com/videoplayback?id=$videoId"
            } else {
                "https://expired.googlevideo.com/videoplayback?id=$videoId"
            }
        }

        val ytSpec = DataSpec(Uri.parse("yt://sampleVideoId123"))
        val length = dataSource.open(ytSpec)

        assertEquals(1024L, length)
        // Verify exactly 2 calls: first normal, second with forceRefresh = true
        assertEquals(2, resolverCalls.size)
        assertEquals("sampleVideoId123" to false, resolverCalls[0])
        assertEquals("sampleVideoId123" to true, resolverCalls[1])

        // Verify upstream was reopened with the fresh URL
        assertEquals(2, fakeUpstream.openCallCount)
        assertEquals(
            "https://fresh.googlevideo.com/videoplayback?id=sampleVideoId123",
            fakeUpstream.openedDataSpecs[1].uri.toString()
        )
    }

    @Test
    fun testUnresolvableTrackThrowsIOException() {
        val fakeUpstream = FakeUpstreamDataSource()
        val dataSource = YouTubeResolvingDataSource(fakeUpstream) { _, _ -> null }

        try {
            dataSource.open(DataSpec(Uri.parse("yt://unresolvableVideo")))
            fail("Expected IOException when resolver returns null")
        } catch (e: IOException) {
            assertTrue(e.message?.contains("Unable to resolve") == true)
        }
    }
}
