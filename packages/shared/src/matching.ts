import type { JobKeyword, KeywordResult, MatchReport } from './application';

/**
 * Deterministic keyword matcher. The AI only *extracts* keywords from the job
 * description; whether the candidate has them is decided here, in plain code,
 * so the score is explainable, reproducible and cannot be "hallucinated".
 */

const WEIGHTS = { required: 3, preferred: 1 } as const;

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9+#./\s-]/g, ' ')
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whole-phrase match: "java" must not match "javascript"; "c++" and "c#" work. */
export function containsTerm(haystackNormalized: string, term: string): boolean {
  const t = normalize(term);
  if (!t) return false;
  const pattern = new RegExp(`(^|[^a-z0-9+#])${escapeRegex(t)}(?=$|[^a-z0-9+#])`);
  if (pattern.test(haystackNormalized)) return true;
  // tolerate simple plurals ("api" vs "apis")
  if (!t.endsWith('s')) {
    const plural = new RegExp(`(^|[^a-z0-9+#])${escapeRegex(t)}s(?=$|[^a-z0-9+#])`);
    return plural.test(haystackNormalized);
  }
  return false;
}

export function scoreMatch(keywords: JobKeyword[], candidateText: string): MatchReport {
  const hay = normalize(candidateText);
  const seen = new Set<string>();
  const results: KeywordResult[] = [];

  for (const k of keywords) {
    const key = normalize(k.term);
    if (!key || seen.has(key)) continue; // dedupe
    seen.add(key);
    const candidates = [k.term, ...k.synonyms];
    const hit = candidates.find((c) => containsTerm(hay, c)) ?? null;
    results.push({ ...k, matched: hit !== null, matchedAs: hit });
  }

  const sum = (rs: KeywordResult[]) => rs.reduce((acc, r) => acc + WEIGHTS[r.importance], 0);
  const total = sum(results);
  const got = sum(results.filter((r) => r.matched));
  const req = results.filter((r) => r.importance === 'required');
  const pref = results.filter((r) => r.importance === 'preferred');
  const coverage = (rs: KeywordResult[]) =>
    rs.length === 0 ? 1 : rs.filter((r) => r.matched).length / rs.length;

  return {
    score: total === 0 ? 0 : Math.round((got / total) * 100),
    requiredCoverage: coverage(req),
    preferredCoverage: coverage(pref),
    keywords: results,
  };
}
