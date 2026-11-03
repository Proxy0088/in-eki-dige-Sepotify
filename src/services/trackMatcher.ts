import { YouTubeMusicCandidate, TrackMatchScore } from '../types/trackMatcher';

/**
 * Clean clutter keywords without deleting genuine song titles inside parentheses.
 */
function cleanText(str: string): string {
  return str
    .replace(/\[(?:official|video|audio|music video|4k|hd|lyrics|remastered|full|track|clip).*?\]/gi, ' ')
    .replace(/\((?:official|video|audio|music video|4k|hd|lyrics|remastered|full|track|clip|کلیپ|ویدیو|آهنگ).*?\)/gi, ' ')
    .replace(/[^a-z0-9\u0600-\u06FF\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function computeTokenSimilarity(s1: string, s2: string): number {
  const c1 = cleanText(s1);
  const c2 = cleanText(s2);
  if (c1 === c2) return 1.0;
  if (!c1 || !c2) return 0.0;

  const words1 = new Set(c1.split(' ').filter((w) => w.length > 1));
  const words2 = new Set(c2.split(' ').filter((w) => w.length > 1));
  if (words1.size === 0 || words2.size === 0) return 0.0;

  let intersection = 0;
  for (const w of words1) {
    if (words2.has(w)) intersection++;
  }
  const union = new Set([...words1, ...words2]).size;
  return union > 0 ? intersection / union : 0.0;
}

const PENALTY_KEYWORDS = [
  'remix',
  'live',
  'concert',
  'acoustic',
  'cover',
  'karaoke',
  'instrumental',
  'speed up',
  'slowed',
  'reverb',
  'reaction',
  '8d audio',
  'bass boosted',
  '1 hour',
  'extended',
  'mashup',
  'parody',
];

export const TrackMatcher = {
  /**
   * Score a single YouTube candidate against a canonical track specification.
   * Guarantees that unrelated songs (even by the same artist) are rejected (score 0).
   */
  scoreCandidate(
    canonical: { title: string; artist: string; duration?: number },
    candidate: YouTubeMusicCandidate
  ): TrackMatchScore {
    const canTitleClean = cleanText(canonical.title);
    const candTitleClean = cleanText(candidate.title);

    // 1. Mandatory Title Matching Gate:
    // If the title does not match, it is an entirely DIFFERENT SONG regardless of the artist!
    const isExactTitle = canTitleClean === candTitleClean;
    const isSubTitle = canTitleClean.length >= 2 && candTitleClean.includes(canTitleClean);
    const isSuperTitle = candTitleClean.length >= 2 && canTitleClean.includes(candTitleClean);
    const titleSim = computeTokenSimilarity(canonical.title, candidate.title);

    if (!isExactTitle && !isSubTitle && !isSuperTitle && titleSim < 0.4) {
      return {
        candidate,
        score: 0,
        reasons: ['عنوان قطعه مطابقت ندارد (آهنگ کاملاً متفاوت است)'],
      };
    }

    let score = 0;
    const reasons: string[] = [];

    // Title score (up to 50 pts)
    if (isExactTitle) {
      score += 50;
      reasons.push('تطابق کامل عنوان (+50)');
    } else if (isSubTitle || isSuperTitle) {
      score += 42;
      reasons.push('عنوان آهنگ به طور کامل در ویدیو موجود است (+42)');
    } else {
      const pts = Math.round(titleSim * 40);
      score += pts;
      reasons.push(`شباهت عنوان ${(titleSim * 100).toFixed(0)}% (+${pts})`);
    }

    // 2. Artist Similarity (up to 25 pts)
    const canArtistClean = cleanText(canonical.artist);
    const candArtistClean = cleanText(candidate.artist);
    const isExactArtist = canArtistClean === candArtistClean;
    const isSubArtist =
      (canArtistClean.length >= 2 && candArtistClean.includes(canArtistClean)) ||
      (candArtistClean.length >= 2 && canArtistClean.includes(candArtistClean)) ||
      candTitleClean.includes(canArtistClean);
    const artistSim = computeTokenSimilarity(canonical.artist, candidate.artist);

    if (isExactArtist) {
      score += 25;
      reasons.push('تطابق کامل خواننده (+25)');
    } else if (isSubArtist) {
      score += 20;
      reasons.push('تطابق نام خواننده (+20)');
    } else if (artistSim >= 0.4) {
      const ptsA = Math.round(artistSim * 20);
      score += ptsA;
      reasons.push(`شباهت نام خواننده (+${ptsA})`);
    } else {
      // Do not penalize if alphabet scripts differ (e.g. Persian vs Latin)
      const isDiffScript =
        (/[\u0600-\u06FF]/.test(canonical.artist) && !/[\u0600-\u06FF]/.test(candidate.artist)) ||
        (!/[\u0600-\u06FF]/.test(canonical.artist) && /[\u0600-\u06FF]/.test(candidate.artist));
      if (!isDiffScript) {
        score -= 15;
        reasons.push('خواننده متفاوت است (-15)');
      }
    }

    // 3. Official Studio Track Bonus (up to 10 pts)
    if (candidate.isSong) {
      score += 10;
      reasons.push('نسخه استودیویی آهنگ رسمی (+10)');
    } else if (candidate.isVideo) {
      score += 4;
      reasons.push('موزیک ویدیو رسمی (+4)');
    }

    // 4. Duration Tolerance Check (up to 15 pts or heavy penalty)
    if (canonical.duration && candidate.duration) {
      const delta = Math.abs(canonical.duration - candidate.duration);
      if (delta <= 3) {
        score += 15;
        reasons.push(`تطابق دقیق زمان پخش (اختلاف ${delta} ثانیه) (+15)`);
      } else if (delta <= 8) {
        score += 8;
        reasons.push(`زمان پخش نزدیک (اختلاف ${delta} ثانیه) (+8)`);
      } else if (delta > 30) {
        score -= 35;
        reasons.push(`اختلاف زیاد زمان پخش (${delta} ثانیه) (-35)`);
      } else if (delta > 60) {
        score -= 70;
        reasons.push(`تفاوت زمان به احتمال زیاد نسخه کامل یا کوتاه شده است (-70)`);
      }
    }

    // 5. Version Penalties (anti-remix, anti-live, anti-cover, anti-karaoke)
    const lowerCandTitle = candidate.title.toLowerCase();
    const lowerCanTitle = canonical.title.toLowerCase();
    for (const kw of PENALTY_KEYWORDS) {
      if (lowerCandTitle.includes(kw) && !lowerCanTitle.includes(kw)) {
        score -= 60;
        reasons.push(`جریمه نسخه غیررسمی "${kw}" (-60)`);
        break;
      }
    }

    return {
      candidate,
      score,
      reasons,
    };
  },

  /**
   * Rank all candidates and select the best match above threshold.
   * Default threshold 65 ensures only genuinely matching tracks qualify.
   */
  findBestMatch(
    canonical: { title: string; artist: string; duration?: number },
    candidates: YouTubeMusicCandidate[],
    minScoreThreshold: number = 65
  ): TrackMatchScore | null {
    if (!candidates || candidates.length === 0) return null;

    const scored = candidates
      .map((c) => this.scoreCandidate(canonical, c))
      .sort((a, b) => b.score - a.score);

    if (scored.length > 0 && scored[0].score >= minScoreThreshold) {
      return scored[0];
    }

    return null;
  },

  /**
   * Returns top N candidates with their matching scores for the manual override UI.
   */
  rankCandidates(
    canonical: { title: string; artist: string; duration?: number },
    candidates: YouTubeMusicCandidate[]
  ): TrackMatchScore[] {
    return candidates
      .map((c) => this.scoreCandidate(canonical, c))
      .sort((a, b) => b.score - a.score);
  },
};
