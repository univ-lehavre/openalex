/**
 * Regroupe une liste de chaînes par similarité.
 *
 * Algorithme simple :
 * - calcule la similarité normalisée (1 - distanceLevenshtein / maxLen) entre deux chaînes
 * - parcours les chaînes et place chaque élément dans le premier groupe dont la similarité
 *   avec le représentant du groupe est >= threshold, sinon crée un nouveau groupe
 *
 * Note : implémentation volontairement simple et sans dépendances externes.
 */

type Cluster = string[];

type GroupWithScore = {
  items: Cluster;
  score: number; // between 0 and 1
};

/**
 * Calcule la distance de Levenshtein entre deux chaînes.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;

  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      dp[j] = Math.min(
        dp[j] + 1, // deletion
        dp[j - 1] + 1, // insertion
        prev + cost, // substitution
      );
      prev = temp;
    }
  }

  return dp[n];
}

/**
 * Similarité normalisée entre 0 et 1 (1 = identique)
 */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(a, b);
  return 1 - dist / maxLen;
}

/**
 * groupBySimilarity(strings, threshold)
 * - strings: liste d'entrées (chaînes)
 * - threshold: seuil de similarité pour mettre dans le même groupe (valeur entre 0 et 1)
 *
 * Renvoie un tableau de groupes (chaque groupe est une liste de chaînes).
 */
function groupBySimilarity(
  strings: string[],
  threshold = 0.75,
  options: { keepDuplicates?: boolean } = {},
): Cluster[] {
  if (!Array.isArray(strings)) throw new TypeError('strings must be an array of strings');
  if (strings.length === 0) return [];

  const keepDuplicates = Boolean(options.keepDuplicates);

  // Prepare the list to cluster: either keep all occurrences or remove
  // case-insensitive duplicates while preserving the first occurrence's casing.
  let uniques: string[];
  if (keepDuplicates) {
    uniques = strings.map(s => String(s));
  } else {
    const seen = new Map<string, string>();
    for (const raw of strings) {
      const s = String(raw);
      const key = s.toLowerCase();
      if (!seen.has(key)) seen.set(key, s);
    }
    uniques = Array.from(seen.values());
  }

  const groups: Cluster[] = [];

  for (const s of uniques) {
    let placed = false;
    for (const group of groups) {
      // use first element of group as representative
      const rep = group[0];
      if (similarity(s.toLowerCase(), rep.toLowerCase()) >= threshold) {
        group.push(s);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([s]);
  }

  return groups;
}

/**
 * Variante qui retourne les groupes avec un score de similarité.
 * Le score est la moyenne des similarités de chaque élément du groupe
 * par rapport au représentant (premier élément) du groupe.
 */
function groupBySimilarityWithScore(
  strings: string[],
  threshold = 0.75,
  options: { keepDuplicates?: boolean } = {},
): GroupWithScore[] {
  const groups = groupBySimilarity(strings, threshold, options);
  return groups.map(group => {
    const rep = group[0];
    const sum = group.reduce((acc, it) => acc + similarity(it.toLowerCase(), rep.toLowerCase()), 0);
    const score = group.length === 0 ? 0 : sum / group.length;
    return { items: group, score };
  });
}

export { groupBySimilarity, groupBySimilarityWithScore, type Cluster, type GroupWithScore };
