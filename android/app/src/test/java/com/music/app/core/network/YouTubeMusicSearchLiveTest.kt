package com.music.app.core.network

import com.music.app.core.network.newpipe.NewPipeOkHttpDownloader
import com.music.app.core.network.newpipe.YouTubeMusicRepository
import kotlinx.coroutines.runBlocking
import org.junit.BeforeClass
import org.junit.Test
import org.schabi.newpipe.extractor.NewPipe

class YouTubeMusicSearchLiveTest {

    companion object {
        @BeforeClass
        @JvmStatic
        fun setup() {
            NewPipe.init(NewPipeOkHttpDownloader.getInstance())
        }
    }

    @Test
    fun runFiveSearchTests() = runBlocking {
        val testQueries = listOf(
            "محسن یگانه بهت قول میدم" to "1. آهنگ فارسی مشهور (با نام خواننده)",
            "بهت قول میدم" to "1. آهنگ فارسی مشهور (فقط نام آهنگ)",
            "Blinding Lights" to "2. آهنگ انگلیسی مشهور",
            "shadmehr eshghe" to "3. اسم آهنگ + خواننده",
            "eshgh" to "4. یک اسم مبهم",
            "roses" to "5. آهنگ با نسخه‌ی ریمیکس معروف",
            "SAINt JHN roses" to "5. آهنگ با نسخه‌ی ریمیکس معروف (با خواننده)"
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
