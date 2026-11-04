package com.music.app.core.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "user_preferences")

class UserPreferencesRepository(private val context: Context) {

    private object PreferencesKeys {
        val LIKED_TRACKS = stringSetPreferencesKey("liked_track_ids")
        val IS_NATIONAL_NET = booleanPreferencesKey("is_national_net")
        val IS_DARK_THEME = booleanPreferencesKey("is_dark_theme")
        val USER_LIBRARIES = stringSetPreferencesKey("user_libraries")
    }

    val likedTrackIds: Flow<Set<String>> = context.dataStore.data.map { preferences ->
        preferences[PreferencesKeys.LIKED_TRACKS] ?: setOf("track-1", "track-3", "track-5", "track-7")
    }

    val isNationalNet: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[PreferencesKeys.IS_NATIONAL_NET] ?: false
    }

    val isDarkTheme: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[PreferencesKeys.IS_DARK_THEME] ?: true
    }

    val userLibraries: Flow<Set<String>> = context.dataStore.data.map { preferences ->
        preferences[PreferencesKeys.USER_LIBRARIES] ?: setOf("Chill Waves", "Gaming Sessions", "Recent Grooves")
    }

    suspend fun toggleLike(trackId: String) {
        context.dataStore.edit { preferences ->
            val current = preferences[PreferencesKeys.LIKED_TRACKS] ?: setOf("track-1", "track-3", "track-5", "track-7")
            if (current.contains(trackId)) {
                preferences[PreferencesKeys.LIKED_TRACKS] = current - trackId
            } else {
                preferences[PreferencesKeys.LIKED_TRACKS] = current + trackId
            }
        }
    }

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
        context.dataStore.edit { preferences ->
            val current = preferences[PreferencesKeys.USER_LIBRARIES] ?: setOf("Chill Waves", "Gaming Sessions", "Recent Grooves")
            preferences[PreferencesKeys.USER_LIBRARIES] = current + name
        }
    }
}
