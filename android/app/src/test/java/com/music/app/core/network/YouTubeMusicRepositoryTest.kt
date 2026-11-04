package com.music.app.core.network

import com.music.app.core.network.newpipe.YouTubeMusicRepository
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class YouTubeMusicRepositoryTest {

    @Test
    fun testPersianTextNormalization() {
        val raw1 = "محسن يگانه"
        val raw2 = "محسن یگانه"
        val norm1 = YouTubeMusicRepository.normalizeText(raw1)
        val norm2 = YouTubeMusicRepository.normalizeText(raw2)
        assertEquals("Arabic 'ي' must normalize to Persian 'ی'", norm1, norm2)

        val withKaf = "كتاب"
        val normKaf = YouTubeMusicRepository.normalizeText(withKaf)
        assertEquals("Arabic 'ك' must normalize to Persian 'ک'", "کتاب", normKaf)

        val withZwnj = "می\u200Cخواهم"
        val normZwnj = YouTubeMusicRepository.normalizeText(withZwnj)
        assertEquals("Zero-width non-joiner should normalize to space", "می خواهم", normZwnj)
    }

    @Test
    fun testArtistCleaningAndParsing() {
        val topicArtist = "Shadmehr Aghili - Topic"
        val cleaned = YouTubeMusicRepository.cleanArtistName(topicArtist)
        assertEquals("Shadmehr Aghili", cleaned)

        val collab1 = "Shadmehr Aghili feat. Ebi"
        val artists1 = YouTubeMusicRepository.parseArtists(collab1)
        assertEquals(listOf("Shadmehr Aghili", "Ebi"), artists1)

        val collab2 = "Taylor Swift & Post Malone"
        val artists2 = YouTubeMusicRepository.parseArtists(collab2)
        assertEquals(listOf("Taylor Swift", "Post Malone"), artists2)
    }

    @Test
    fun testRankingBothArtistAndTitleMatchHigherThanRemixOrPartial() {
        val query = "shadmehr eshghe"

        val originalScore = YouTubeMusicRepository.scoreTrack(
            query = query,
            trackTitle = "Eshghe",
            rawArtist = "Shadmehr Aghili - Topic",
            durationSec = 210
        )

        val remixScore = YouTubeMusicRepository.scoreTrack(
            query = query,
            trackTitle = "Eshghe (DJ Remix 2024)",
            rawArtist = "Shadmehr Aghili",
            durationSec = 210
        )

        val unrelatedScore = YouTubeMusicRepository.scoreTrack(
            query = query,
            trackTitle = "Bi To Hargez",
            rawArtist = "Shadmehr Aghili",
            durationSec = 250
        )

        assertTrue(
            "Original official song matching both artist and title ($originalScore) must rank higher than remix ($remixScore)",
            originalScore > remixScore
        )

        assertTrue(
            "Song matching both artist and title ($originalScore) must rank higher than title-only/unrelated ($unrelatedScore)",
            originalScore > unrelatedScore
        )
    }

    @Test
    fun testRemixAllowedWhenExplicitlySearched() {
        val queryWithRemix = "shadmehr eshghe remix"

        val remixScore = YouTubeMusicRepository.scoreTrack(
            query = queryWithRemix,
            trackTitle = "Eshghe (Remix)",
            rawArtist = "Shadmehr Aghili",
            durationSec = 210
        )

        // When user explicitly searches for "remix", penalty should NOT be applied
        assertTrue("Remix search must not penalize remix track", remixScore > 500)
    }
}
