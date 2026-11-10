package com.music.app.core.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.music.app.core.model.Track
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import org.json.JSONArray
import org.json.JSONObject

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "user_preferences")

class UserPreferencesRepository(private val context: Context) {

    private object PreferencesKeys {
        val LIKED_TRACKS = stringSetPreferencesKey("liked_track_ids")
        val DOWNLOADED_TRACKS = stringSetPreferencesKey("downloaded_track_ids")
        val IS_NATIONAL_NET = booleanPreferencesKey("is_national_net")
        val IS_DARK_THEME = booleanPreferencesKey("is_dark_theme")
        val USER_LIBRARIES = stringSetPreferencesKey("user_libraries")
        val RECENT_PLAYED_JSON = stringPreferencesKey("recent_played_tracks_json")
        val RECENT_SEARCHES_JSON = stringPreferencesKey("recent_searches_json")
        val PLAYLISTS_MAP_JSON = stringPreferencesKey("playlists_tracks_map_json")
    }

    // Liked songs IDs (clean default emptySet)
    val likedTrackIds: Flow<Set<String>> = context.dataStore.data.map { preferences ->
        preferences[PreferencesKeys.LIKED_TRACKS] ?: emptySet()
    }

    // Downloaded songs IDs
    val downloadedTrackIds: Flow<Set<String>> = context.dataStore.data.map { preferences ->
        preferences[PreferencesKeys.DOWNLOADED_TRACKS] ?: emptySet()
    }

    val isNationalNet: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[PreferencesKeys.IS_NATIONAL_NET] ?: false
    }

    val isDarkTheme: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[PreferencesKeys.IS_DARK_THEME] ?: true
    }

    // List of user custom playlists / folders
    val userLibraries: Flow<Set<String>> = context.dataStore.data.map { preferences ->
        preferences[PreferencesKeys.USER_LIBRARIES] ?: setOf("Chill Waves", "Gaming Sessions", "Recent Grooves")
    }

    // Recently played tracks list (persisted to disk)
    val recentPlayedTracks: Flow<List<Track>> = context.dataStore.data.map { preferences ->
        val jsonStr = preferences[PreferencesKeys.RECENT_PLAYED_JSON] ?: ""
        if (jsonStr.isEmpty()) {
            emptyList()
        } else {
            try {
                val array = JSONArray(jsonStr)
                val list = mutableListOf<Track>()
                for (i in 0 until array.length()) {
                    list.add(Track.fromJson(array.getJSONObject(i)))
                }
                list
            } catch (e: Exception) {
                emptyList()
            }
        }
    }

    // Recently searched queries list (persisted to disk)
    val recentSearchQueries: Flow<List<String>> = context.dataStore.data.map { preferences ->
        val jsonStr = preferences[PreferencesKeys.RECENT_SEARCHES_JSON] ?: ""
        if (jsonStr.isEmpty()) {
            emptyList()
        } else {
            try {
                val array = JSONArray(jsonStr)
                val list = mutableListOf<String>()
                for (i in 0 until array.length()) {
                    list.add(array.getString(i))
                }
                list
            } catch (e: Exception) {
                emptyList()
            }
        }
    }

    // Map of playlistName -> List<Track>
    val playlistsMap: Flow<Map<String, List<Track>>> = context.dataStore.data.map { preferences ->
        val jsonStr = preferences[PreferencesKeys.PLAYLISTS_MAP_JSON] ?: ""
        if (jsonStr.isEmpty()) {
            emptyMap()
        } else {
            try {
                val root = JSONObject(jsonStr)
                val map = mutableMapOf<String, List<Track>>()
                val keys = root.keys()
                while (keys.hasNext()) {
                    val key = keys.next()
                    val arr = root.getJSONArray(key)
                    val tracks = mutableListOf<Track>()
                    for (i in 0 until arr.length()) {
                        tracks.add(Track.fromJson(arr.getJSONObject(i)))
                    }
                    map[key] = tracks
                }
                map
            } catch (e: Exception) {
                emptyMap()
            }
        }
    }

    suspend fun toggleLike(trackId: String) {
        context.dataStore.edit { preferences ->
            val current = preferences[PreferencesKeys.LIKED_TRACKS] ?: emptySet()
            if (current.contains(trackId)) {
                preferences[PreferencesKeys.LIKED_TRACKS] = current - trackId
            } else {
                preferences[PreferencesKeys.LIKED_TRACKS] = current + trackId
            }
        }
    }

    suspend fun toggleDownload(trackId: String) {
        context.dataStore.edit { preferences ->
            val current = preferences[PreferencesKeys.DOWNLOADED_TRACKS] ?: emptySet()
            if (current.contains(trackId)) {
                preferences[PreferencesKeys.DOWNLOADED_TRACKS] = current - trackId
            } else {
                preferences[PreferencesKeys.DOWNLOADED_TRACKS] = current + trackId
            }
        }
    }

    suspend fun addRecentTrack(track: Track) {
        context.dataStore.edit { preferences ->
            val jsonStr = preferences[PreferencesKeys.RECENT_PLAYED_JSON] ?: ""
            val list = mutableListOf<Track>()
            if (jsonStr.isNotEmpty()) {
                try {
                    val array = JSONArray(jsonStr)
                    for (i in 0 until array.length()) {
                        list.add(Track.fromJson(array.getJSONObject(i)))
                    }
                } catch (_: Exception) {}
            }
            // Prepend new track and deduplicate by ID
            list.removeAll { it.id == track.id }
            list.add(0, track)
            // Limit to recent 50 tracks
            val trimmed = list.take(50)
            val outArray = JSONArray()
            trimmed.forEach { outArray.put(it.toJson()) }
            preferences[PreferencesKeys.RECENT_PLAYED_JSON] = outArray.toString()
        }
    }

    suspend fun addSearchQuery(query: String) {
        val trimmed = query.trim()
        if (trimmed.isEmpty()) return
        context.dataStore.edit { preferences ->
            val jsonStr = preferences[PreferencesKeys.RECENT_SEARCHES_JSON] ?: ""
            val list = mutableListOf<String>()
            if (jsonStr.isNotEmpty()) {
                try {
                    val array = JSONArray(jsonStr)
                    for (i in 0 until array.length()) {
                        list.add(array.getString(i))
                    }
                } catch (_: Exception) {}
            }
            list.removeAll { it.equals(trimmed, ignoreCase = true) }
            list.add(0, trimmed)
            val outArray = JSONArray()
            list.take(20).forEach { outArray.put(it) }
            preferences[PreferencesKeys.RECENT_SEARCHES_JSON] = outArray.toString()
        }
    }

    suspend fun removeSearchQuery(query: String) {
        context.dataStore.edit { preferences ->
            val jsonStr = preferences[PreferencesKeys.RECENT_SEARCHES_JSON] ?: ""
            if (jsonStr.isNotEmpty()) {
                try {
                    val array = JSONArray(jsonStr)
                    val list = mutableListOf<String>()
                    for (i in 0 until array.length()) {
                        val item = array.getString(i)
                        if (!item.equals(query, ignoreCase = true)) {
                            list.add(item)
                        }
                    }
                    val outArray = JSONArray()
                    list.forEach { outArray.put(it) }
                    preferences[PreferencesKeys.RECENT_SEARCHES_JSON] = outArray.toString()
                } catch (_: Exception) {}
            }
        }
    }

    suspend fun clearSearchQueries() {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.RECENT_SEARCHES_JSON] = "[]"
        }
    }

    suspend fun addRecentSearchQuery(query: String) = addSearchQuery(query)
    suspend fun removeRecentSearchQuery(query: String) = removeSearchQuery(query)
    suspend fun clearRecentSearches() = clearSearchQueries()
    suspend fun createPlaylist(name: String) = addUserLibrary(name)

    suspend fun setNationalNet(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.IS_NATIONAL_NET] = enabled
        }
    }

    suspend fun setDarkTheme(isDark: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.IS_DARK_THEME] = isDark
        }
    }

    suspend fun addUserLibrary(name: String) {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) return
        context.dataStore.edit { preferences ->
            val current = preferences[PreferencesKeys.USER_LIBRARIES] ?: setOf("Chill Waves", "Gaming Sessions", "Recent Grooves")
            preferences[PreferencesKeys.USER_LIBRARIES] = current + trimmed
        }
    }

    suspend fun toggleTrackInPlaylist(playlistName: String, track: Track) {
        context.dataStore.edit { preferences ->
            val jsonStr = preferences[PreferencesKeys.PLAYLISTS_MAP_JSON] ?: ""
            val root = if (jsonStr.isNotEmpty()) {
                try { JSONObject(jsonStr) } catch (_: Exception) { JSONObject() }
            } else {
                JSONObject()
            }

            val existingArr = root.optJSONArray(playlistName) ?: JSONArray()
            val list = mutableListOf<Track>()
            for (i in 0 until existingArr.length()) {
                list.add(Track.fromJson(existingArr.getJSONObject(i)))
            }

            if (list.any { it.id == track.id }) {
                list.removeAll { it.id == track.id }
            } else {
                list.add(0, track.copy(collection = playlistName))
            }

            val newArr = JSONArray()
            list.forEach { newArr.put(it.toJson()) }
            root.put(playlistName, newArr)
            preferences[PreferencesKeys.PLAYLISTS_MAP_JSON] = root.toString()
        }
    }
}
