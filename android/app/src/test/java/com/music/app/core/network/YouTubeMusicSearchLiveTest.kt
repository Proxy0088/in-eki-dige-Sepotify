package com.music.app.core.network

import com.music.app.core.network.newpipe.NewPipeOkHttpDownloader
import com.music.app.core.network.newpipe.YouTubeMusicRepository
import kotlinx.coroutines.runBlocking
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import org.junit.BeforeClass
import org.junit.Test
import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.ServiceList
import org.schabi.newpipe.extractor.services.youtube.linkHandler.YoutubeSearchQueryHandlerFactory
import java.util.concurrent.TimeUnit

class YouTubeMusicSearchLiveTest {

    companion object {
        @BeforeClass
        @JvmStatic
        fun setup() {
            NewPipe.init(NewPipeOkHttpDownloader.getInstance())
        }
    }

    @Test
    fun diagnoseLayersForTargetQueries() = runBlocking {
        val targets = listOf("Bi To Hargez Shadmehr", "Bohemian Rhapsody Queen")
        val client = OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(12, TimeUnit.SECONDS)
            .build()

        println("\n========================================================")
        println("=== STEP 0 DIAGNOSTICS: LAYER BY LAYER TEST ===")
        println("========================================================")

        for (query in targets) {
            println("\n>>> DIAGNOSING QUERY: '$query'")

            // 1. Direct InnerTube Check
            try {
                val postJson = JSONObject().apply {
                    put("context", JSONObject().apply {
                        put("client", JSONObject().apply {
                            put("clientName", "WEB_REMIX")
                            put("clientVersion", "1.20240101.01.00")
                            put("hl", "en")
                            put("gl", "US")
                        })
                    })
                    put("query", query)
                }
                val request = Request.Builder()
                    .url("https://music.youtube.com/youtubei/v1/search")
                    .header("Content-Type", "application/json")
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    .header("Referer", "https://music.youtube.com/")
                    .header("Origin", "https://music.youtube.com")
                    .post(postJson.toString().toRequestBody("application/json".toMediaType()))
                    .build()

                val resp = client.newCall(request).execute()
                val code = resp.code
                val body = resp.body?.string() ?: ""
                val hasBotWall = body.contains("Sign in to confirm you're not a bot") || body.contains("automated queries")
                val json = try { JSONObject(body) } catch (_: Exception) { null }
                val hasRenderer = json?.optJSONObject("contents")?.optJSONObject("tabbedSearchResultsRenderer") != null

                println("  [InnerTube Layer]")
                println("    HTTP Status: $code")
                println("    Has tabbedSearchResultsRenderer: $hasRenderer")
                println("    Is Bot Wall: $hasBotWall")
                println("    Body Length: ${body.length} chars")
            } catch (e: Exception) {
                println("  [InnerTube Layer] Exception: ${e.javaClass.simpleName} - ${e.message}")
            }

            // 2. NewPipe with MUSIC_SONGS filter
            try {
                val service = ServiceList.YouTube
                val searchQHFactory = service.searchQHFactory
                val qh = searchQHFactory.fromQuery(
                    query,
                    listOf(YoutubeSearchQueryHandlerFactory.MUSIC_SONGS),
                    ""
                )
                val extractor = service.getSearchExtractor(qh)
                extractor.fetchPage()
                val items = extractor.initialPage?.items
                println("  [NewPipe Layer (MUSIC_SONGS filter)]")
                println("    Exception: None")
                println("    extractor.initialPage?.items?.size: ${items?.size ?: 0}")
                items?.take(3)?.forEachIndexed { idx, it ->
                    println("      $idx: ${it.name} (${it.url})")
                }
            } catch (e: Exception) {
                println("  [NewPipe Layer (MUSIC_SONGS filter)] Exception: ${e.javaClass.simpleName} - ${e.message}")
            }

            // 3. NewPipe with NO filter (general search)
            try {
                val service = ServiceList.YouTube
                val searchQHFactory = service.searchQHFactory
                val qh = searchQHFactory.fromQuery(
                    query,
                    emptyList(),
                    ""
                )
                val extractor = service.getSearchExtractor(qh)
                extractor.fetchPage()
                val items = extractor.initialPage?.items
                println("  [NewPipe Layer (NO filter)]")
                println("    Exception: None")
                println("    extractor.initialPage?.items?.size: ${items?.size ?: 0}")
                items?.take(3)?.forEachIndexed { idx, it ->
                    println("      $idx: ${it.name} (${it.url})")
                }
            } catch (e: Exception) {
                println("  [NewPipe Layer (NO filter)] Exception: ${e.javaClass.simpleName} - ${e.message}")
            }
        }
        println("\n========================================================")
    }

    @Test
    fun runFiveSearchTests() = runBlocking {
        val testQueries = listOf(
            "Bi To Hargez Shadmehr" to "Step 0 Target: Bi To Hargez Shadmehr",
            "Bohemian Rhapsody Queen" to "Step 0 Target: Bohemian Rhapsody Queen",
            "محسن یگانه بهت قول میدم" to "1. آهنگ فارسی مشهور (با نام خواننده)",
            "بهت قول میدم" to "1. آهنگ فارسی مشهور (فقط نام آهنگ)",
            "Blinding Lights" to "2. آهنگ انگلیسی مشهور",
            "shadmehr eshghe" to "3. اسم آهنگ + خواننده"
        )

        println("================ SEARCH TEST RESULTS ================")
        for ((query, label) in testQueries) {
            println("\n>>> TEST: $label [Query: '$query']")
            try {
                val results = YouTubeMusicRepository.searchSongs(query, limit = 5)
                if (results.isEmpty()) {
                    println("  (No results returned)")
                } else {
                    results.forEachIndexed { index, track ->
                        println("  [${index + 1}] Title: \"${track.title}\" | Artist: \"${track.artist}\" | Album: \"${track.album}\" | Duration: ${track.durationFormatted} (${track.duration}s)")
                    }
                }
            } catch (e: Exception) {
                println("  Error during search: ${e.message}")
            }
        }
        println("\n=====================================================")
    }
}
