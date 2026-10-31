package com.music.app;

import android.Manifest;
import android.content.ContentUris;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "MediaStorePlugin",
    permissions = {
        @Permission(
            alias = "audio_legacy",
            strings = { Manifest.permission.READ_EXTERNAL_STORAGE }
        ),
        @Permission(
            alias = "audio_tiramisu",
            strings = { "android.permission.READ_MEDIA_AUDIO" }
        )
    }
)
public class MediaStorePlugin extends Plugin {

    private String getPermissionAlias() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return "audio_tiramisu";
        } else {
            return "audio_legacy";
        }
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        String alias = getPermissionAlias();
        if (getPermissionState(alias) == com.getcapacitor.PermissionState.GRANTED) {
            JSObject ret = new JSObject();
            ret.put("audio", "granted");
            call.resolve(ret);
        } else {
            JSObject ret = new JSObject();
            ret.put("audio", "prompt");
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        String alias = getPermissionAlias();
        if (getPermissionState(alias) == com.getcapacitor.PermissionState.GRANTED) {
            JSObject ret = new JSObject();
            ret.put("audio", "granted");
            call.resolve(ret);
        } else {
            requestPermissionForAlias(alias, call, "permissionCallback");
        }
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        String alias = getPermissionAlias();
        JSObject ret = new JSObject();
        if (getPermissionState(alias) == com.getcapacitor.PermissionState.GRANTED) {
            ret.put("audio", "granted");
        } else {
            ret.put("audio", "denied");
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void queryAudioFiles(PluginCall call) {
        String alias = getPermissionAlias();
        if (getPermissionState(alias) != com.getcapacitor.PermissionState.GRANTED) {
            call.reject("Permission not granted to read audio files");
            return;
        }

        JSArray tracksArray = new JSArray();

        Uri collection;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            collection = MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL);
        } else {
            collection = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
        }

        String[] projection = new String[] {
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.ALBUM_ID,
            MediaStore.Audio.Media.IS_MUSIC,
            MediaStore.Audio.Media.DATE_ADDED
        };

        String selection = MediaStore.Audio.Media.IS_MUSIC + " != 0";
        String sortOrder = MediaStore.Audio.Media.DATE_ADDED + " DESC";

        try (Cursor cursor = getContext().getContentResolver().query(
            collection,
            projection,
            selection,
            null,
            sortOrder
        )) {
            if (cursor != null) {
                int idColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID);
                int titleColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE);
                int artistColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST);
                int albumColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM);
                int durationColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION);
                int albumIdColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID);
                int dateAddedColumn = cursor.getColumnIndex(MediaStore.Audio.Media.DATE_ADDED);

                while (cursor.moveToNext()) {
                    long id = cursor.getLong(idColumn);
                    String title = cursor.getString(titleColumn);
                    String artist = cursor.getString(artistColumn);
                    String album = cursor.getString(albumColumn);
                    long duration = cursor.getLong(durationColumn);
                    long albumId = cursor.getLong(albumIdColumn);
                    long dateAdded = dateAddedColumn != -1 ? cursor.getLong(dateAddedColumn) : 0;

                    // Content URI for the audio file
                    Uri contentUri = ContentUris.withAppendedId(
                        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                        id
                    );

                    JSObject trackObj = new JSObject();
                    trackObj.put("id", String.valueOf(id));
                    trackObj.put("title", title != null ? title : "Unknown Title");
                    trackObj.put("artist", (artist != null && !artist.equals("<unknown>")) ? artist : "Unknown Artist");
                    trackObj.put("album", (album != null && !album.equals("<unknown>")) ? album : "Phone Storage");
                    trackObj.put("duration", duration > 0 ? (duration / 1000) : 0);
                    trackObj.put("uri", contentUri.toString());
                    trackObj.put("dateAdded", dateAdded);

                    // Album Art URI (only if albumId is valid)
                    if (albumId > 0) {
                        Uri albumArtUri = ContentUris.withAppendedId(
                            Uri.parse("content://media/external/audio/albumart"),
                            albumId
                        );
                        trackObj.put("albumArtUri", albumArtUri.toString());
                    }

                    tracksArray.put(trackObj);
                }
            }
        } catch (Exception e) {
            call.reject("Failed to query MediaStore: " + e.getMessage(), e);
            return;
        }

        JSObject result = new JSObject();
        result.put("tracks", tracksArray);
        call.resolve(result);
    }
}
