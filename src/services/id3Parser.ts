export interface AudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  pictureUrl?: string;
}

export class ID3Parser {
  public static async parseBlob(blob: Blob): Promise<AudioMetadata> {
    const metadata: AudioMetadata = {};

    try {
      // Read first 512KB which almost always contains ID3v2 header and frames including APIC cover art
      const headerSlice = blob.slice(0, Math.min(blob.size, 512 * 1024));
      const buffer = await headerSlice.arrayBuffer();
      const view = new DataView(buffer);

      if (view.byteLength >= 10) {
        // Check "ID3" identifier
        if (
          view.getUint8(0) === 0x49 && // 'I'
          view.getUint8(1) === 0x44 && // 'D'
          view.getUint8(2) === 0x33    // '3'
        ) {
          const majorVersion = view.getUint8(3); // 3 for ID3v2.3, 4 for ID3v2.4
          const tagSize =
            ((view.getUint8(6) & 0x7f) << 21) |
            ((view.getUint8(7) & 0x7f) << 14) |
            ((view.getUint8(8) & 0x7f) << 7) |
            (view.getUint8(9) & 0x7f);

          const maxOffset = Math.min(buffer.byteLength, 10 + tagSize);
          let offset = 10;

          while (offset + 10 < maxOffset) {
            // Read 4-character Frame ID
            let frameId = '';
            for (let i = 0; i < 4; i++) {
              const charCode = view.getUint8(offset + i);
              if (charCode < 32 || charCode > 126) break;
              frameId += String.fromCharCode(charCode);
            }

            if (frameId.length < 4) break;

            // Frame size
            let frameSize = 0;
            if (majorVersion === 4) {
              // syncsafe in 2.4
              frameSize =
                ((view.getUint8(offset + 4) & 0x7f) << 21) |
                ((view.getUint8(offset + 5) & 0x7f) << 14) |
                ((view.getUint8(offset + 6) & 0x7f) << 7) |
                (view.getUint8(offset + 7) & 0x7f);
            } else {
              frameSize = view.getUint32(offset + 4, false);
            }

            if (frameSize <= 0 || offset + 10 + frameSize > buffer.byteLength) {
              break;
            }

            const frameDataOffset = offset + 10;

            if (frameId === 'TIT2' && !metadata.title) {
              metadata.title = this.decodeTextFrame(view, frameDataOffset, frameSize);
            } else if (frameId === 'TPE1' && !metadata.artist) {
              metadata.artist = this.decodeTextFrame(view, frameDataOffset, frameSize);
            } else if (frameId === 'TALB' && !metadata.album) {
              metadata.album = this.decodeTextFrame(view, frameDataOffset, frameSize);
            } else if (frameId === 'APIC' && !metadata.pictureUrl) {
              try {
                const picBlob = this.extractApicPicture(buffer, frameDataOffset, frameSize);
                if (picBlob) {
                  metadata.pictureUrl = URL.createObjectURL(picBlob);
                }
              } catch (e) {
                console.warn('Error extracting APIC frame:', e);
              }
            }

            offset += 10 + frameSize;
          }
        }
      }
    } catch (e) {
      console.warn('Failed parsing ID3 tags:', e);
    }

    return metadata;
  }

  private static decodeTextFrame(view: DataView, offset: number, size: number): string {
    if (size <= 1) return '';
    const encoding = view.getUint8(offset);
    const bytes = new Uint8Array(view.buffer, offset + 1, size - 1);

    try {
      if (encoding === 0) {
        // ISO-8859-1
        let text = '';
        for (let i = 0; i < bytes.length; i++) {
          if (bytes[i] === 0) break;
          text += String.fromCharCode(bytes[i]);
        }
        return text.trim();
      } else if (encoding === 1 || encoding === 2) {
        // UTF-16
        const decoder = new TextDecoder('utf-16');
        return decoder.decode(bytes).replace(/\0/g, '').trim();
      } else if (encoding === 3) {
        // UTF-8
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(bytes).replace(/\0/g, '').trim();
      }
    } catch {
      // Fallback
    }

    return '';
  }

  private static extractApicPicture(buffer: ArrayBuffer, offset: number, size: number): Blob | null {
    const view = new DataView(buffer);
    const encoding = view.getUint8(offset);
    let cur = offset + 1;

    // Read MIME type (null-terminated ASCII)
    let mime = '';
    while (cur < offset + size && view.getUint8(cur) !== 0) {
      mime += String.fromCharCode(view.getUint8(cur));
      cur++;
    }
    cur++; // Skip null byte

    if (!mime || mime === 'image/') {
      mime = 'image/jpeg';
    }

    // Skip picture type byte
    cur++;

    // Skip description (null-terminated)
    if (encoding === 1 || encoding === 2) {
      // UTF-16: two null bytes
      while (cur + 1 < offset + size) {
        if (view.getUint8(cur) === 0 && view.getUint8(cur + 1) === 0) {
          cur += 2;
          break;
        }
        cur += 2;
      }
    } else {
      // 1 null byte
      while (cur < offset + size && view.getUint8(cur) !== 0) {
        cur++;
      }
      cur++;
    }

    const imgBytesLength = offset + size - cur;
    if (imgBytesLength > 100) {
      const imgBytes = new Uint8Array(buffer, cur, imgBytesLength);
      return new Blob([imgBytes], { type: mime });
    }

    return null;
  }
}
