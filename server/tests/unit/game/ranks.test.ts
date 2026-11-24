import { describe, expect, it } from 'vitest';
import { RANKS, rankFor, rankStatus } from '../../../src/game/index.js';

const none = { legendary: 0, mythic: 0 };

describe('RANKS table', () => {
  it('goes from E IV to SS with 4 divisions per letter', () => {
    expect(RANKS).toHaveLength(25);
    expect(RANKS[0]!.label).toBe('E IV');
    expect(RANKS.at(-2)!.label).toBe('S I');
    expect(RANKS.at(-1)!.label).toBe('SS');
  });

  it('requires a higher level for every rank', () => {
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i]!.minLevel).toBeGreaterThan(RANKS[i - 1]!.minLevel);
    }
  });

  it('never lowers the real-life requirements', () => {
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i]!.requiredLegendary).toBeGreaterThanOrEqual(RANKS[i - 1]!.requiredLegendary);
      expect(RANKS[i]!.requiredMythic).toBeGreaterThanOrEqual(RANKS[i - 1]!.requiredMythic);
    }
  });
});

describe('rankFor', () => {
  it('reaches E to C with XP alone', () => {
    expect(rankFor(1, none).code).toBe('E4');
    expect(rankFor(2, none).code).toBe('E4');
    expect(rankFor(3, none).code).toBe('E3');
    expect(rankFor(10, none).code).toBe('D4');
    expect(rankFor(34, none).code).toBe('C1');
  });

  it('stays at C I without a verified achievement, whatever the level', () => {
    expect(rankFor(45, none).code).toBe('C1');
    expect(rankFor(200, none).code).toBe('C1');
  });

  it('unlocks B with one verified Legendary achievement', () => {
    expect(rankFor(38, { legendary: 1, mythic: 0 }).code).toBe('B4');
    expect(rankFor(55, { legendary: 1, mythic: 0 }).code).toBe('B1');
  });

  it('still needs the level, even with achievements', () => {
    expect(rankFor(20, { legendary: 5, mythic: 2 }).code).toBe('D1');
  });

  it('needs 3 verified achievements for A', () => {
    expect(rankFor(60, { legendary: 2, mythic: 0 }).code).toBe('B1');
    expect(rankFor(60, { legendary: 3, mythic: 0 }).code).toBe('A4');
  });

  it('needs a Mythic achievement for S', () => {
    expect(rankFor(90, { legendary: 10, mythic: 0 }).code).toBe('A1');
    expect(rankFor(90, { legendary: 3, mythic: 1 }).code).toBe('S3');
  });

  it('counts Mythic achievements as Legendary ones too', () => {
    // 3 Mythic = 3 verified achievements, enough for A
    expect(rankFor(60, { legendary: 0, mythic: 3 }).code).toBe('A4');
  });

  it('reaches SS at level 110 with 2 Mythic + 5 Legendary', () => {
    expect(rankFor(110, { legendary: 5, mythic: 2 }).code).toBe('SS');
    expect(rankFor(110, { legendary: 4, mythic: 2 }).code).toBe('S1');
    expect(rankFor(109, { legendary: 5, mythic: 2 }).code).toBe('S1');
  });
});

describe('rankStatus', () => {
  it('gives the next rank and no lock while the level is not reached', () => {
    const status = rankStatus(5, none);

    expect(status.current.code).toBe('E2');
    expect(status.next?.code).toBe('E1');
    expect(status.lockedBy).toBeNull();
  });

  it('explains what is missing when the level is enough but achievements are not', () => {
    const status = rankStatus(45, none);

    expect(status.current.code).toBe('C1');
    expect(status.next?.code).toBe('B4');
    expect(status.lockedBy).toEqual({ legendary: 1, mythic: 0 });
  });

  it('asks for a Mythic before S', () => {
    const status = rankStatus(85, { legendary: 3, mythic: 0 });

    expect(status.current.code).toBe('A1');
    expect(status.lockedBy).toEqual({ legendary: 0, mythic: 1 });
  });

  it('counts a missing Mythic toward the total requirement', () => {
    // SS needs 7 verified including 2 Mythic. With 3 Legendary + 1 Mythic (4 verified),
    // the missing Mythic brings the total to 5, so 2 more Legendary are needed.
    const status = rankStatus(115, { legendary: 3, mythic: 1 });

    expect(status.current.code).toBe('S1');
    expect(status.lockedBy).toEqual({ legendary: 2, mythic: 1 });
  });

  it('asks only for the next rank, not ranks further up', () => {
    // Level 85 with 2 achievements is B I: the next step (A IV) needs 1 more achievement
    const status = rankStatus(85, { legendary: 2, mythic: 0 });

    expect(status.current.code).toBe('B1');
    expect(status.lockedBy).toEqual({ legendary: 1, mythic: 0 });
  });

  it('has no next rank at SS', () => {
    const status = rankStatus(150, { legendary: 9, mythic: 3 });

    expect(status.current.code).toBe('SS');
    expect(status.next).toBeNull();
    expect(status.lockedBy).toBeNull();
  });
});
