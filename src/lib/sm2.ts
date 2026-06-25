// SuperMemo-2 spaced repetition
export type SM2Card = { ef: number; interval: number; review_count: number };

export function sm2(card: SM2Card, quality: 0 | 3 | 5) {
  const ef = Math.max(1.3, card.ef + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  let interval: number;
  const rc = card.review_count;
  if (quality < 3) interval = 1;
  else if (rc === 0) interval = 1;
  else if (rc === 1) interval = 3;
  else interval = Math.round(card.interval * ef);
  return { ef, interval: Math.min(interval, 180) };
}

export function isDue(nextReview: string | null): boolean {
  if (!nextReview) return true;
  return new Date(nextReview) <= new Date();
}

export function nextReviewLabel(nextReview: string | null): string {
  if (!nextReview || isDue(nextReview)) return "Due now";
  const d = Math.ceil((new Date(nextReview).getTime() - Date.now()) / 86400000);
  if (d === 1) return "Tomorrow";
  if (d < 7) return `${d} days`;
  if (d < 30) return `${Math.round(d / 7)}w`;
  return `${Math.round(d / 30)}mo`;
}

export function isMastered(interval: number) {
  return interval >= 30;
}
