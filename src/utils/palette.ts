import { useState, useEffect } from 'react';

export interface CoverPalette {
  primary: string;    // rgb(...) e.g. dominant album hue
  secondary: string;  // rgb(...) e.g. secondary vibrant tone
  accent: string;     // rgb(...)
  highlight: string;  // rgba(255, 255, 255, 0.85)
  glow: string;       // rgba(...) with alpha for soft spread
}

// Preset vibrant harmonic palettes based on string hash
const PRESET_PALETTES: Array<{ primary: string; secondary: string; accent: string }> = [
  { primary: 'rgb(34, 197, 94)', secondary: 'rgb(163, 230, 53)', accent: 'rgb(20, 184, 166)' },   // Emerald / Lime
  { primary: 'rgb(245, 158, 11)', secondary: 'rgb(251, 146, 60)', accent: 'rgb(234, 88, 12)' },   // Amber / Orange
  { primary: 'rgb(59, 130, 246)', secondary: 'rgb(99, 102, 241)', accent: 'rgb(14, 165, 233)' },  // Sky / Indigo
  { primary: 'rgb(168, 85, 247)', secondary: 'rgb(236, 72, 153)', accent: 'rgb(192, 132, 252)' }, // Purple / Pink
  { primary: 'rgb(16, 185, 129)', secondary: 'rgb(52, 211, 153)', accent: 'rgb(45, 212, 191)' },  // Mint / Teal
  { primary: 'rgb(239, 68, 68)', secondary: 'rgb(249, 115, 22)', accent: 'rgb(251, 191, 36)' },   // Coral / Sunset
];

function getHashPalette(seed: string): { primary: string; secondary: string; accent: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % PRESET_PALETTES.length;
  return PRESET_PALETTES[idx];
}

export function useCoverPalette(
  coverUrl?: string,
  title: string = '',
  artist: string = ''
): CoverPalette {
  const fallback = getHashPalette(`${title}:::${artist}`);

  const [palette, setPalette] = useState<CoverPalette>({
    primary: fallback.primary,
    secondary: fallback.secondary,
    accent: fallback.accent,
    highlight: 'rgba(255, 255, 255, 0.88)',
    glow: fallback.primary.replace('rgb', 'rgba').replace(')', ', 0.35)'),
  });

  useEffect(() => {
    const hashPal = getHashPalette(`${title}:::${artist}`);
    if (!coverUrl) {
      setPalette({
        primary: hashPal.primary,
        secondary: hashPal.secondary,
        accent: hashPal.accent,
        highlight: 'rgba(255, 255, 255, 0.88)',
        glow: hashPal.primary.replace('rgb', 'rgba').replace(')', ', 0.35)'),
      });
      return;
    }

    let isMounted = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = coverUrl;

    img.onload = () => {
      if (!isMounted) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;

        // Sample dominant saturated colors
        let bestSat = -1;
        let pR = 34, pG = 197, pB = 94; // fallback green
        let sR = 163, sG = 230, sB = 53;

        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;
          const sat = max === 0 ? 0 : delta / max;

          // Reject extreme darks or whites
          const lum = (r * 0.299 + g * 0.587 + b * 0.114);
          if (lum > 25 && lum < 235 && sat > bestSat) {
            bestSat = sat;
            pR = r;
            pG = g;
            pB = b;
          }
        }

        // Secondary color slightly offset
        sR = Math.min(255, Math.floor(pR * 0.8 + 40));
        sG = Math.min(255, Math.floor(pG * 0.9 + 30));
        sB = Math.min(255, Math.floor(pB * 0.7 + 50));

        const primaryRgb = `rgb(${pR}, ${pG}, ${pB})`;
        const secondaryRgb = `rgb(${sR}, ${sG}, ${sB})`;
        const accentRgb = `rgb(${Math.min(255, pR + 30)}, ${Math.min(255, pG + 40)}, ${Math.min(255, pB + 20)})`;

        setPalette({
          primary: primaryRgb,
          secondary: secondaryRgb,
          accent: accentRgb,
          highlight: 'rgba(255, 255, 255, 0.90)',
          glow: `rgba(${pR}, ${pG}, ${pB}, 0.35)`,
        });
      } catch {
        // CORS fallback to hash palette
        setPalette({
          primary: hashPal.primary,
          secondary: hashPal.secondary,
          accent: hashPal.accent,
          highlight: 'rgba(255, 255, 255, 0.88)',
          glow: hashPal.primary.replace('rgb', 'rgba').replace(')', ', 0.35)'),
        });
      }
    };

    img.onerror = () => {
      if (!isMounted) return;
      setPalette({
        primary: hashPal.primary,
        secondary: hashPal.secondary,
        accent: hashPal.accent,
        highlight: 'rgba(255, 255, 255, 0.88)',
        glow: hashPal.primary.replace('rgb', 'rgba').replace(')', ', 0.35)'),
      });
    };

    return () => {
      isMounted = false;
    };
  }, [coverUrl, title, artist]);

  return palette;
}
