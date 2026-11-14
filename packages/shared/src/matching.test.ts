import { describe, expect, it } from 'vitest';
import { containsTerm, normalize, scoreMatch } from './matching';
import type { JobKeyword } from './application';

const kw = (
  term: string,
  importance: 'required' | 'preferred',
  synonyms: string[] = [],
): JobKeyword => ({
  term,
  importance,
  synonyms,
  category: 'hard_skill',
});

describe('containsTerm', () => {
  it('does not match substrings of other words', () => {
    expect(containsTerm(normalize('I write JavaScript daily'), 'Java')).toBe(false);
    expect(containsTerm(normalize('Java and Spring'), 'Java')).toBe(true);
  });

  it('handles symbols like C++, C# and Node.js', () => {
    const hay = normalize('Experienced in C++, C# and Node.js');
    expect(containsTerm(hay, 'C++')).toBe(true);
    expect(containsTerm(hay, 'C#')).toBe(true);
    expect(containsTerm(hay, 'node.js')).toBe(true);
    expect(containsTerm(hay, 'C')).toBe(false);
  });

  it('tolerates plurals and hyphen variants', () => {
    expect(containsTerm(normalize('Built REST APIs'), 'REST API')).toBe(true);
    expect(containsTerm(normalize('full-stack developer'), 'full stack')).toBe(true);
  });
});

describe('scoreMatch', () => {
  it('weights required keywords above preferred ones', () => {
    const keywords = [kw('TypeScript', 'required'), kw('Docker', 'preferred')];
    expect(scoreMatch(keywords, 'TypeScript').score).toBe(75);
    expect(scoreMatch(keywords, 'Docker').score).toBe(25);
    expect(scoreMatch(keywords, 'TypeScript Docker').score).toBe(100);
  });

  it('uses synonyms and reports what matched', () => {
    const r = scoreMatch([kw('PostgreSQL', 'required', ['Postgres'])], 'Postgres in production');
    expect(r.score).toBe(100);
    expect(r.keywords[0]?.matchedAs).toBe('Postgres');
  });

  it('dedupes repeated keywords and handles empty input', () => {
    expect(
      scoreMatch([kw('React', 'required'), kw('react', 'required')], 'x').keywords,
    ).toHaveLength(1);
    expect(scoreMatch([], 'anything').score).toBe(0);
  });
});
