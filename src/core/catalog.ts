import type { FinishId, WorkId } from './types';

export interface Finish {
  id: FinishId;
  label: string;
  swatch: string;
  planningFactor: number;
}

export interface Artwork {
  id: WorkId;
  title: string;
  series: 'Relationship Lessons';
  story: string;
  themes: string[];
  availability: 'mini_available';
  miniPriceUsd: 80;
  spatialEligible: boolean;
  customScaleEligible: boolean;
}

export const FINISHES: readonly Finish[] = [
  { id: 'pla-basic-black', label: 'Black', swatch: '#171717', planningFactor: 1 },
  { id: 'pla-basic-jade-white', label: 'Jade White', swatch: '#e7e5df', planningFactor: 1.04 },
  { id: 'pla-metal-iron-gray', label: 'Iron Gray', swatch: '#6b7280', planningFactor: 1.12 },
  { id: 'pla-silk-plus-gold', label: 'Gold', swatch: '#b88b35', planningFactor: 1.18 },
] as const;

export const ARTWORKS: readonly Artwork[] = [
  {
    id: 'the-braider',
    title: 'The Braider',
    series: 'Relationship Lessons',
    story: 'A study of trust: separate strands become stronger without losing their individual paths.',
    themes: ['trust', 'connection', 'sister', 'family', 'partnership', 'strength', 'gift'],
    availability: 'mini_available',
    miniPriceUsd: 80,
    spatialEligible: true,
    customScaleEligible: true,
  },
  {
    id: 'the-nurturer',
    title: 'The Nurturer',
    series: 'Relationship Lessons',
    story: 'Care takes shape through patience, protection, and the choice to help another person grow.',
    themes: ['care', 'mother', 'family', 'growth', 'protection', 'gift'],
    availability: 'mini_available',
    miniPriceUsd: 80,
    spatialEligible: false,
    customScaleEligible: false,
  },
  {
    id: 'transceiver',
    title: 'Transceiver',
    series: 'Relationship Lessons',
    story: 'Communication is complete only when we make room to receive as honestly as we transmit.',
    themes: ['communication', 'listening', 'signal', 'relationship', 'dialogue'],
    availability: 'mini_available',
    miniPriceUsd: 80,
    spatialEligible: false,
    customScaleEligible: false,
  },
  {
    id: 'the-wave',
    title: 'The Wave',
    series: 'Relationship Lessons',
    story: 'Change can carry us forward when resilience becomes a practiced rhythm instead of a fixed pose.',
    themes: ['change', 'resilience', 'movement', 'healing', 'courage'],
    availability: 'mini_available',
    miniPriceUsd: 80,
    spatialEligible: false,
    customScaleEligible: false,
  },
  {
    id: 'bearer-of-the-code',
    title: 'Bearer of the Code',
    series: 'Relationship Lessons',
    story: 'Knowledge becomes a legacy when it is carried responsibly and shared with the next generation.',
    themes: ['legacy', 'knowledge', 'leadership', 'technology', 'wisdom'],
    availability: 'mini_available',
    miniPriceUsd: 80,
    spatialEligible: false,
    customScaleEligible: false,
  },
] as const;

export const WORK_IDS = ARTWORKS.map(({ id }) => id) as [WorkId, ...WorkId[]];
export const FINISH_IDS = FINISHES.map(({ id }) => id) as [FinishId, ...FinishId[]];

export function getArtwork(workId: WorkId): Artwork {
  const artwork = ARTWORKS.find(({ id }) => id === workId);
  if (!artwork) throw new Error(`Missing reviewed artwork: ${workId}`);
  return artwork;
}

export function getFinish(finishId: FinishId): Finish {
  const finish = FINISHES.find(({ id }) => id === finishId);
  if (!finish) throw new Error(`Missing reviewed finish: ${finishId}`);
  return finish;
}

function roundTo25(value: number): number {
  return Math.round(value / 25) * 25;
}

export function estimateCustomScale(heightIn: number, finishId: FinishId): { low: number; high: number } {
  const materialFactor = getFinish(finishId).planningFactor;
  const scaleFactor = Math.max(1, Math.pow(heightIn / 18, 1.55));
  const midpoint = 750 * scaleFactor * materialFactor;
  return {
    low: roundTo25(midpoint * 0.9),
    high: roundTo25(midpoint * 1.2),
  };
}

export function curateArtworks(intent: string, maximumBudgetUsd?: number): Artwork[] {
  const tokens = intent.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return ARTWORKS
    .filter(({ miniPriceUsd }) => maximumBudgetUsd === undefined || miniPriceUsd <= maximumBudgetUsd)
    .map((artwork, index) => ({
      artwork,
      index,
      score: artwork.themes.reduce(
        (sum, theme) => sum + (tokens.some((token) => theme.includes(token) || token.includes(theme)) ? 4 : 0),
        artwork.id === 'the-braider' && tokens.includes('trust') ? 8 : 0,
      ),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3)
    .map(({ artwork }) => artwork);
}
