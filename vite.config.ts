import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

function streamResolutionPlugin() {
  let ytdlInstance: any = null;
  const streamCache = new Map<
    string,
    { url: string; mimeType: string; expires: number; duration?: number; title?: string; artist?: string }
  >();

  async function proxyAudioStream(
    audioUrl: string,
    req: any,
    res: any,
    mimeType: string = 'audio/webm'
  ) {
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const upstream = await fetch(audioUrl, { headers });
    const outHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'bytes',
      'Content-Type': mimeType,
    };

    const cl = upstream.headers.get('content-length');
    if (cl) outHeaders['Content-Length'] = cl;

    const cr = upstream.headers.get('content-range');
    if (cr) outHeaders['Content-Range'] = cr;

    res.writeHead(upstream.status, outHeaders);

    const { Readable } = await import('stream');
    if (upstream.body) {
      Readable.fromWeb(upstream.body as any).pipe(res);
    } else {
      res.end();
    }
  }

  return {
    name: 'stream-resolution-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        // Stream direct proxy endpoint (/api/stream?v=...)
        if (req.url && req.url.startsWith('/api/stream?')) {
          const parsed = new URL(req.url, 'http://localhost:3000');
          const videoId = parsed.searchParams.get('v');
          if (!videoId) {
            res.statusCode = 400;
            res.end('Missing v parameter');
            return;
          }

          try {
            if (!ytdlInstance) {
              const { Ytdl } = await import('@distube/ytdl-core');
              ytdlInstance = new Ytdl();
            }

            const cached = streamCache.get(videoId);
            if (cached && Date.now() < cached.expires) {
              await proxyAudioStream(cached.url, req, res, cached.mimeType);
              return;
            }

            const { chooseFormat } = await import('@distube/ytdl-core');
            const info = await ytdlInstance.getInfo(videoId);
            const format = chooseFormat(info.formats, { quality: 'highestaudio' });

            if (format && format.url) {
              streamCache.set(videoId, {
                url: format.url,
                mimeType: format.mimeType || 'audio/webm',
                expires: Date.now() + 4 * 60 * 60 * 1000,
              });

              await proxyAudioStream(format.url, req, res, format.mimeType || 'audio/webm');
              return;
            }

            res.statusCode = 404;
            res.end('Audio format not found');
          } catch (err: any) {
            console.warn('Stream resolver error:', videoId, err?.message);
            res.statusCode = 500;
            res.end('Failed to resolve stream');
          }
          return;
        }

        // Stream JSON info endpoint (/api/stream-info?v=...)
        if (req.url && req.url.startsWith('/api/stream-info?')) {
          const parsed = new URL(req.url, 'http://localhost:3000');
          const videoId = parsed.searchParams.get('v');
          if (!videoId) {
            res.statusCode = 400;
            res.end('Missing v parameter');
            return;
          }

          try {
            if (!ytdlInstance) {
              const { Ytdl } = await import('@distube/ytdl-core');
              ytdlInstance = new Ytdl();
            }

            const cached = streamCache.get(videoId);
            if (cached && Date.now() < cached.expires) {
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(
                JSON.stringify({
                  videoId,
                  title: cached.title,
                  artist: cached.artist,
                  duration: cached.duration,
                  url: cached.url,
                  mimeType: cached.mimeType,
                })
              );
              return;
            }

            const { chooseFormat } = await import('@distube/ytdl-core');
            const info = await ytdlInstance.getInfo(videoId);
            const format = chooseFormat(info.formats, { quality: 'highestaudio' });
            const duration = parseInt(info.videoDetails.lengthSeconds, 10);
            const title = info.videoDetails.title;
            const artist = info.videoDetails.author?.name;

            if (format && format.url) {
              streamCache.set(videoId, {
                url: format.url,
                mimeType: format.mimeType || 'audio/webm',
                expires: Date.now() + 4 * 60 * 60 * 1000,
                duration,
                title,
                artist,
              });
            }

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(
              JSON.stringify({
                videoId,
                title,
                artist,
                duration,
                url: format?.url || null,
                mimeType: format?.mimeType || null,
              })
            );
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ error: err?.message || 'Resolution failed' }));
          }
          return;
        }

        // YouTube Music proxy endpoint (/api/ytmusic/...)
        // Strips any local Origin header to eliminate 403 Forbidden errors
        if (req.url && req.url.startsWith('/api/ytmusic')) {
          const targetUrl = 'https://music.youtube.com' + req.url.replace(/^\/api\/ytmusic/, '');
          try {
            const chunks: any[] = [];
            for await (const chunk of req) {
              chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
            }
            const bodyBuffer = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

            const headers: Record<string, string> = {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Referer': 'https://music.youtube.com/',
              'Origin': 'https://music.youtube.com',
              'Content-Type': req.headers['content-type'] || 'application/json',
            };

            const upstream = await fetch(targetUrl, {
              method: req.method,
              headers,
              body: bodyBuffer,
            });

            res.writeHead(upstream.status, {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': upstream.headers.get('content-type') || 'application/json',
            });

            const { Readable } = await import('stream');
            if (upstream.body) {
              Readable.fromWeb(upstream.body as any).pipe(res);
            } else {
              res.end();
            }
          } catch (err: any) {
            console.warn('ytmusic proxy error:', err?.message);
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ error: err?.message }));
          }
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), streamResolutionPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      proxy: {
        '/api/musicdel': {
          target: 'https://musicdel.ir',
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/api\/musicdel/, ''),
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        },
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
