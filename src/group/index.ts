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
  options: { keepDuplicates?: boolean; normalize?: NormalizeOptions | false } = {},
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

  for (const sRaw of uniques) {
    const s = options.normalize === false ? sRaw : normalizeString(sRaw, options.normalize ?? {});
    let placed = false;
    for (const group of groups) {
      // use first element of group as representative
      const repRaw = group[0];
      const rep =
        options.normalize === false ? repRaw : normalizeString(repRaw, options.normalize ?? {});
      if (similarity(s, rep) >= threshold) {
        group.push(sRaw);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([sRaw]);
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
  options: { keepDuplicates?: boolean; normalize?: NormalizeOptions | false } = {},
): GroupWithScore[] {
  const groups = groupBySimilarity(strings, threshold, options);
  return groups.map(group => {
    const repRaw = group[0];
    const rep =
      options.normalize === false ? repRaw : normalizeString(repRaw, options.normalize ?? {});
    const sum = group.reduce((acc, itRaw) => {
      const it =
        options.normalize === false ? itRaw : normalizeString(itRaw, options.normalize ?? {});
      return acc + similarity(it, rep);
    }, 0);
    const score = group.length === 0 ? 0 : sum / group.length;
    return { items: group, score };
  });
}

/**
 * Retourne l'ensemble des n-grams d'une chaîne (sliding window), en minuscules.
 */
function ngramsOf(s: string, n: number): Set<string> {
  const out = new Set<string>();
  const str = s.toLowerCase();
  if (n <= 0) return out;
  for (let i = 0; i + n <= str.length; i++) {
    out.add(str.slice(i, i + n));
  }
  return out;
}

/**
 * Jaccard similarity between two sets.
 */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Compute n-gram similarity using multiple n values and optional weights.
 * Returns a value in [0,1].
 */
function ngramSimilarity(
  a: string,
  b: string,
  nValues: number[] = [2, 3],
  weights?: number[],
): number {
  if (a === b) return 1;
  const norms = nValues.map(n => {
    const sa = ngramsOf(a, n);
    const sb = ngramsOf(b, n);
    return jaccard(sa, sb);
  });
  if (weights && weights.length === norms.length) {
    const totalW = weights.reduce((s, w) => s + w, 0) || 1;
    return norms.reduce((acc, v, i) => acc + v * (weights[i] / totalW), 0);
  }
  // simple average
  return norms.reduce((s, v) => s + v, 0) / norms.length;
}

/**
 * Normalise une chaîne : options communes
 * - removeDiacritics: retire les accents
 * - removePunctuation: supprime la ponctuation
 * - collapseWhitespace: remplace les suites d'espaces par un seul espace et trim
 * - lower: met en minuscules
 */
type NormalizeOptions = {
  removeDiacritics?: boolean;
  removePunctuation?: boolean;
  collapseWhitespace?: boolean;
  lower?: boolean;
};

function normalizeString(input: string, options: NormalizeOptions = {}): string {
  const {
    removeDiacritics = true,
    removePunctuation = true,
    collapseWhitespace = true,
    lower = true,
  } = options;

  let s = String(input);

  if (removeDiacritics) {
    // NFD then remove combining marks
    s = s.normalize('NFD').replace(/\p{M}/gu, '');
  }

  if (removePunctuation) {
    // keep letters, numbers, spaces and hyphen/underscore
    s = s.replace(/[^\p{L}\p{N}\s_-]/gu, '');
  }

  if (collapseWhitespace) {
    s = s.replace(/\s+/g, ' ').trim();
  }

  if (lower) s = s.toLowerCase();

  return s;
}

export { normalizeString };

/**
 * Regroupe par similarité basée sur n-grams (Jaccard) — supporte bi-gram et tri-gram.
 * options: { keepDuplicates?: boolean, nValues?: number[], weights?: number[] }
 */
function groupByNGramSimilarity(
  strings: string[],
  threshold = 0.5,
  options: {
    keepDuplicates?: boolean;
    nValues?: number[];
    weights?: number[];
    normalize?: NormalizeOptions | false;
  } = {},
): Cluster[] {
  if (!Array.isArray(strings)) throw new TypeError('strings must be an array of strings');
  if (strings.length === 0) return [];

  const keepDuplicates = Boolean(options.keepDuplicates);
  const nValues =
    Array.isArray(options.nValues) && options.nValues.length > 0 ? options.nValues : [2, 3];
  const weights = options.weights;

  let items: string[];
  if (keepDuplicates) items = strings.map(s => String(s));
  else {
    const seen = new Map<string, string>();
    for (const raw of strings) {
      const s = String(raw);
      const key = s.toLowerCase();
      if (!seen.has(key)) seen.set(key, s);
    }
    items = Array.from(seen.values());
  }

  const groups: Cluster[] = [];
  for (const sRaw of items) {
    const s = options.normalize === false ? sRaw : normalizeString(sRaw, options.normalize ?? {});
    let placed = false;
    for (const group of groups) {
      const rep = group[0];
      const repNorm =
        options.normalize === false ? rep : normalizeString(rep, options.normalize ?? {});
      if (ngramSimilarity(s, repNorm, nValues, weights) >= threshold) {
        group.push(sRaw);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([sRaw]);
  }
  return groups;
}

export {
  groupBySimilarity,
  groupBySimilarityWithScore,
  groupByNGramSimilarity,
  type Cluster,
  type GroupWithScore,
};
