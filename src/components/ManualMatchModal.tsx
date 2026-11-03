import React, { useState, useEffect } from 'react';
import { X, Check, Search, Music, Link, Sparkles, AlertCircle } from 'lucide-react';
import { Track } from '../types/music';
import { YouTubeMusicProvider } from '../services/youtubeMusicProvider';
import { TrackMatcher } from '../services/trackMatcher';
import { TrackMatchCache } from '../services/trackMatchCache';
import { TrackMatchScore } from '../types/trackMatcher';

interface ManualMatchModalProps {
  track: Track;
  isOpen: boolean;
  onClose: () => void;
  onMatchSelected: (track: Track, newVideoId: string) => void;
}

export const ManualMatchModal: React.FC<ManualMatchModalProps> = ({
  track,
  isOpen,
  onClose,
  onMatchSelected,
}) => {
  const [candidates, setCandidates] = useState<TrackMatchScore[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [customLinkOrId, setCustomLinkOrId] = useState<string>('');
  const [manualError, setManualError] = useState<string | null>(null);

  const currentMatch = TrackMatchCache.getMatch(track.artist, track.title);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setManualError(null);

    const query = `${track.artist} ${track.title}`.trim();
    YouTubeMusicProvider.searchCandidates(query)
      .then((items) => {
        if (!isMounted) return;
        const scored = TrackMatcher.rankCandidates(
          {
            title: track.title,
            artist: track.artist,
            duration: track.duration,
          },
          items
        );
        setCandidates(scored);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Error fetching candidates for manual match:', err);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, track]);

  if (!isOpen) return null;

  const extractVideoId = (input: string): string | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

    try {
      const url = new URL(trimmed);
      if (url.searchParams.has('v')) return url.searchParams.get('v');
      if (url.pathname.includes('/watch/')) {
        const parts = url.pathname.split('/watch/');
        return parts[1]?.split('?')[0] || null;
      }
      if (url.hostname === 'youtu.be') {
        return url.pathname.replace('/', '').split('?')[0] || null;
      }
    } catch {
      // not a valid url
    }
    return null;
  };

  const handleSelectCandidate = (candidateVideoId: string, candTitle?: string, candArtist?: string) => {
    TrackMatchCache.saveManualOverride(
      track.artist,
      track.title,
      candidateVideoId,
      candTitle,
      candArtist
    );
    onMatchSelected(track, candidateVideoId);
    onClose();
  };

  const handleApplyCustomLink = () => {
    const vid = extractVideoId(customLinkOrId);
    if (!vid) {
      setManualError('لینک یا شناسه یوتیوب نامعتبر است (باید ۱۱ کاراکتر باشد).');
      return;
    }

    handleSelectCandidate(vid, track.title, track.artist);
  };

  const formatSec = (sec?: number) => {
    if (!sec || sec <= 0) return '--:--';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-[32px] p-6 relative overflow-hidden text-neutral-200"
        style={{
          background: 'linear-gradient(145deg, #242424, #1a1a1a)',
          boxShadow: '12px 12px 28px #141414, -12px -12px 28px #2a2a2a',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                اصلاح نسخه پخش (تطبیق دستی)
              </h2>
              <p className="text-xs text-neutral-400 truncate max-w-[260px]">
                {track.title} • {track.artist}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors text-neutral-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Custom URL Input Section */}
        <div className="mt-4 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
          <label className="block text-xs font-medium text-neutral-300 mb-1.5 flex items-center gap-1.5">
            <Link size={13} className="text-emerald-400" />
            ثبت مستقیم لینک یا شناسه YouTube / YouTube Music:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customLinkOrId}
              onChange={(e) => {
                setCustomLinkOrId(e.target.value);
                setManualError(null);
              }}
              placeholder="مثلاً: https://music.youtube.com/watch?v=... یا ID"
              className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
              dir="ltr"
            />
            <button
              onClick={handleApplyCustomLink}
              disabled={!customLinkOrId.trim()}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-bold text-xs rounded-xl transition-all shadow-md active:scale-95"
            >
              ثبت
            </button>
          </div>
          {manualError && (
            <p className="text-red-400 text-[11px] mt-1.5 flex items-center gap-1">
              <AlertCircle size={12} />
              {manualError}
            </p>
          )}
        </div>

        {/* Current Match Info */}
        {currentMatch && (
          <div className="mt-3 px-3 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between text-xs">
            <span className="text-neutral-400">نسخه فعال کنونی:</span>
            <span className="text-emerald-400 font-mono" dir="ltr">
              ID: {currentMatch.videoId} {currentMatch.manualOverride ? '(دستی)' : '(خودکار)'}
            </span>
          </div>
        )}

        {/* Candidates List */}
        <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-2.5 max-h-[420px]">
          <div className="text-xs text-neutral-400 flex items-center gap-1 px-1">
            <Search size={12} />
            پیشنهادات هوشمند یوتیوب موزیک بر اساس دقت انطباق:
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-neutral-400">
              <div className="w-7 h-7 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
              <span className="text-xs">در حال واکشی نسخه‌های موجود...</span>
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500">
              نسخه مناسبی یافت نشد. می‌توانید لینک را بالا به صورت دستی وارد کنید.
            </div>
          ) : (
            candidates.map(({ candidate, score, reasons }) => {
              const isCurrent = currentMatch?.videoId === candidate.videoId;
              return (
                <div
                  key={candidate.videoId}
                  className={`p-3 rounded-2xl border transition-all flex items-center gap-3 ${
                    isCurrent
                      ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                  }`}
                >
                  <img
                    src={candidate.thumbnailUrl}
                    alt={candidate.title}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-xl object-cover bg-neutral-800 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white truncate">
                        {candidate.title}
                      </h4>
                      {candidate.isSong && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                          Official
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {candidate.artist}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-neutral-500 mt-1">
                      <span>زمان: {formatSec(candidate.duration)}</span>
                      <span>امتیاز دقت: {Math.max(0, score)}%</span>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      handleSelectCandidate(
                        candidate.videoId,
                        candidate.title,
                        candidate.artist
                      )
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                      isCurrent
                        ? 'bg-emerald-500 text-black shadow-md'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    {isCurrent ? (
                      <span className="flex items-center gap-1">
                        <Check size={12} />
                        فعال
                      </span>
                    ) : (
                      'انتخاب'
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
