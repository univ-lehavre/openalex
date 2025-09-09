import { groupBySimilarity, groupBySimilarityWithScore } from './index';

describe('groupBySimilarity', () => {
  test('groupe des chaînes identiques', () => {
    const input = ['a', 'a', 'a'];
    const groups = groupBySimilarity(input, 0.9);
    expect(groups.length).toBe(1);
    // duplicates are removed before grouping, so only one 'a' remains
    expect(groups[0].sort()).toEqual(['a'].sort());
  });

  test('sépare des items différents', () => {
    const input = ['Paris', 'Lyon', 'Marseille'];
    const groups = groupBySimilarity(input, 0.9);
    expect(groups.length).toBe(3);
  });

  test('regroupe des variantes proches', () => {
    const input = ['Paris', 'Pariss', 'Pari', 'Lyon'];
    const groups = groupBySimilarity(input, 0.7);
    // Paris variants should be grouped
    const hasParisGroup = groups.some(
      g => g.includes('Paris') && g.includes('Pariss') && g.includes('Pari'),
    );
    expect(hasParisGroup).toBe(true);
    expect(groups.length).toEqual(2);
  });

  test('gère la casse (insensible)', () => {
    const input = ['Paris', 'paris', 'PARIS'];
    const groups = groupBySimilarity(input, 0.9);
    expect(groups.length).toBe(1);
  });

  test('retourne vide pour tableau vide', () => {
    expect(groupBySimilarity([], 0.8)).toEqual([]);
  });

  test('élimine les doublons insensibles à la casse avant de grouper', () => {
    const input = ['Paris', 'paris', 'PARIS', 'Lyon', 'lyon'];
    const groups = groupBySimilarity(input, 0.9);
    // 'Paris' and 'paris' should be considered the same item -> uniques preserved
    // Expect two groups: Paris and Lyon
    expect(groups.length).toBe(2);
    const flat = groups.flat();
    // Each unique value should appear only once
    const parisCount = flat.filter(s => s.toLowerCase() === 'paris').length;
    const lyonCount = flat.filter(s => s.toLowerCase() === 'lyon').length;
    expect(parisCount).toBe(1);
    expect(lyonCount).toBe(1);
  });

  test('garde les doublons si option keepDuplicates=true', () => {
    const input = ['a', 'a', 'A'];
    const groups = groupBySimilarity(input, 0.9, { keepDuplicates: true });
    // duplicates are preserved, but similar items may still be grouped depending on threshold
    // with a high threshold identical items remain in the same group but multiples persist
    expect(groups.length).toBe(1);
    expect(groups[0].length).toBe(3);
  });

  test('groupBySimilarityWithScore retourne des scores valides', () => {
    const input = ['Paris', 'Pariss', 'Lyon'];
    const withScores = groupBySimilarityWithScore(input, 0.7);
    // types : GroupWithScore[] -> each entry has items and score
    expect(Array.isArray(withScores)).toBe(true);
    for (const g of withScores) {
      expect(Array.isArray(g.items)).toBe(true);
      expect(typeof g.score).toBe('number');
      expect(g.score).toBeGreaterThanOrEqual(0);
      expect(g.score).toBeLessThanOrEqual(1);
    }
    // group of identical/similar Paris variants should have score > 0.7
    const parisGroup = withScores.find(g => g.items.some((it: string) => it === 'Paris'));
    expect(parisGroup).toBeDefined();
    expect(parisGroup?.score).toBeGreaterThan(0.7);
  });

  test('groupBySimilarityWithScore respecte keepDuplicates', () => {
    const input = ['a', 'a', 'A'];
    const withKeep = groupBySimilarityWithScore(input, 0.9, { keepDuplicates: true });
    const withoutKeep = groupBySimilarityWithScore(input, 0.9, { keepDuplicates: false });
    expect(withKeep[0].items.length).toBe(3);
    expect(withoutKeep[0].items.length).toBe(1);
  });

  test("lève une TypeError si le paramètre n'est pas un tableau", () => {
    // cast to any to test runtime behavior for invalid inputs
    // Allow calling with invalid runtime values for test purposes
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: intentionally passing invalid runtime value
    expect(() => groupBySimilarity(null)).toThrow(TypeError);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: intentionally passing invalid runtime value
    expect(() => groupBySimilarity(undefined)).toThrow(TypeError);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: intentionally passing invalid runtime value
    expect(() => groupBySimilarity({})).toThrow(TypeError);
    // same for the scored variant
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: intentionally passing invalid runtime value
    expect(() => groupBySimilarityWithScore(null)).toThrow(TypeError);
  });

  test('gère les éléments non-string dans le tableau en les convertissant en string', () => {
    const input = [
      'a',
      null as unknown as string,
      undefined as unknown as string,
      123 as unknown as string,
    ];
    const groups = groupBySimilarity(input, 0.5, { keepDuplicates: true });
    // conversion: null -> 'null', undefined -> 'undefined', 123 -> '123'
    const flat = groups.flat();
    expect(flat).toContain('null');
    expect(flat).toContain('undefined');
    expect(flat).toContain('123');
  });
});
