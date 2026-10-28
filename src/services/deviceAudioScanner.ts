import { Track } from '../types/music';
import { NativeAudioScanner } from './nativeMediaStore';

export class DeviceAudioScanner {
  // Discovers real device tracks from Android MediaStore or returns empty list if no local tracks exist yet
  public static async autoDiscoverDeviceTracks(): Promise<{
    tracks: Track[];
    permissionDenied?: boolean;
    error?: string;
  }> {
    return await NativeAudioScanner.scanDeviceAudio();
  }

  // Helper to process user-selected device audio files from phone storage with real ID3 extraction
  public static async processFiles(files: FileList | File[]): Promise<Track[]> {
    return await NativeAudioScanner.processFileObjects(files);
  }
}
