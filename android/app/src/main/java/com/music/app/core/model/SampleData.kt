package com.music.app.core.model

import androidx.compose.ui.graphics.Color

val SAMPLE_TRACKS = listOf(
    Track(
        id = "track-1",
        title = "Midnight Echoes",
        artist = "Aetheria",
        album = "Neon Horizon",
        duration = 194,
        url = "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3",
        coverUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
        gradientColors = listOf(Color(0xFFE65100), Color(0xFFF57C00), Color(0xFF263238)),
        mood = MoodType.CHILL,
        isLiked = true,
        collection = "recents",
        isNationalNet = false
    ),
    Track(
        id = "track-2",
        title = "Cyber Drifter",
        artist = "Vektor Pulse",
        album = "Zero State",
        duration = 168,
        url = "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=electronic-future-beats-117997.mp3",
        coverUrl = "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80",
        gradientColors = listOf(Color(0xFF1E88E5), Color(0xFF0D47A1), Color(0xFF1A237E)),
        mood = MoodType.GAMING,
        isLiked = false,
        isDownloaded = true,
        collection = "library 2",
        isNationalNet = true
    ),
    Track(
        id = "track-3",
        title = "Solar Radiance",
        artist = "Kroma Sound",
        album = "Daylight Mirage",
        duration = 215,
        url = "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=uplifting-day-15583.mp3",
        coverUrl = "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80",
        gradientColors = listOf(Color(0xFFFBC02D), Color(0xFFF57F17), Color(0xFF3E2723)),
        mood = MoodType.FEELS_GOOD,
        isLiked = true,
        collection = "library 1",
        isNationalNet = false
    ),
    Track(
        id = "track-4",
        title = "Deep Frequency",
        artist = "Zenith",
        album = "Focus Flow",
        duration = 182,
        url = "https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f7762a.mp3?filename=ambient-piano-amp-strings-10711.mp3",
        coverUrl = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
        gradientColors = listOf(Color(0xFF00897B), Color(0xFF004D40), Color(0xFF263238)),
        mood = MoodType.FOCUS,
        isLiked = false,
        isDownloaded = true,
        collection = "recents",
        isNationalNet = false
    ),
    Track(
        id = "track-5",
        title = "Golden Sunset",
        artist = "Velvet Groove",
        album = "Endless Coast",
        duration = 156,
        url = "https://cdn.pixabay.com/download/audio/2022/04/27/audio_65a44a1eec.mp3?filename=chill-abstract-intention-12099.mp3",
        coverUrl = "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
        gradientColors = listOf(Color(0xFFE91E63), Color(0xFF880E4F), Color(0xFF1A1A24)),
        mood = MoodType.CHILL,
        isLiked = true,
        isDownloaded = true,
        collection = "library 1",
        isNationalNet = false
    ),
    Track(
        id = "track-6",
        title = "Hyperdrive Overload",
        artist = "Neural Nexus",
        album = "Arcade Odyssey",
        duration = 142,
        url = "https://cdn.pixabay.com/download/audio/2021/09/06/audio_823b1238d7.mp3?filename=the-cradle-of-your-soul-15700.mp3",
        coverUrl = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
        gradientColors = listOf(Color(0xFFD81B60), Color(0xFF880E4F), Color(0xFF311B92)),
        mood = MoodType.GAMING,
        isLiked = false,
        collection = "library 2",
        isNationalNet = true
    ),
    Track(
        id = "track-7",
        title = "Subtle Geometry",
        artist = "Monolith",
        album = "Quiet Room",
        duration = 204,
        url = "https://cdn.pixabay.com/download/audio/2022/02/07/audio_d0a13f69d2.mp3?filename=lofi-chill-medium-version-159456.mp3",
        coverUrl = "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=600&q=80",
        gradientColors = listOf(Color(0xFF7B1FA2), Color(0xFF4A148C), Color(0xFF12005E)),
        mood = MoodType.FOCUS,
        isLiked = true,
        collection = "recents",
        isNationalNet = false
    ),
    Track(
        id = "track-8",
        title = "Euphoria Waves",
        artist = "Astral Bay",
        album = "Crystal Skies",
        duration = 175,
        url = "https://cdn.pixabay.com/download/audio/2022/11/06/audio_c3716d69f9.mp3?filename=lifelike-126735.mp3",
        coverUrl = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
        gradientColors = listOf(Color(0xFFD32F2F), Color(0xFFB71C1C), Color(0xFF212121)),
        mood = MoodType.FEELS_GOOD,
        isLiked = false,
        collection = "recents",
        isNationalNet = false
    )
)

val SAMPLE_PLAYLISTS = listOf(
    Playlist(
        id = "ambient",
        name = "Ambient",
        nameFa = "امبینت",
        gradientColors = listOf(Color(0xFF6D28D9), Color(0xFF5B21B6), Color(0xFF1E1B4B)),
        borderColor = Color(0xFF8B5CF6).copy(alpha = 0.35f)
    ),
    Playlist(
        id = "rock",
        name = "Rock",
        nameFa = "راک",
        gradientColors = listOf(Color(0xFFDC2626), Color(0xFFBE123C), Color(0xFF450A0A)),
        borderColor = Color(0xFFF43F5E).copy(alpha = 0.35f)
    ),
    Playlist(
        id = "pop",
        name = "Pop Music",
        nameFa = "پاپ",
        gradientColors = listOf(Color(0xFF0284C7), Color(0xFF2563EB), Color(0xFF082F49)),
        borderColor = Color(0xFF38BDF8).copy(alpha = 0.35f)
    ),
    Playlist(
        id = "hiphop",
        name = "Hip Hop",
        nameFa = "هیپ‌هاپ",
        gradientColors = listOf(Color(0xFF9333EA), Color(0xFFA21CAF), Color(0xFF312E81)),
        borderColor = Color(0xFFA855F7).copy(alpha = 0.35f)
    ),
    Playlist(
        id = "blues",
        name = "Blues",
        nameFa = "بلوز",
        gradientColors = listOf(Color(0xFF059669), Color(0xFF0F766E), Color(0xFF064E3B)),
        borderColor = Color(0xFF10B981).copy(alpha = 0.35f)
    ),
    Playlist(
        id = "electronic",
        name = "Electronic",
        nameFa = "الکترونیک",
        gradientColors = listOf(Color(0xFFD97706), Color(0xFFC2410C), Color(0xFF451A03)),
        borderColor = Color(0xFFF59E0B).copy(alpha = 0.35f)
    )
)
