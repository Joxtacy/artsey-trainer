import type { Layout } from './layout';

const WORDS = `the be to of and a in that have it for not on with he as you do at this but his by from they we
say her she or an will my one all would there their what so up out if about who get which go me when make can like
time no just him know take people into year your good some could them see other than then now look only come its over
think also back after use two how our work first well way even new want because any these give day most us is was are
been has had were said did made find long down side been call may part over sound place where right too mean old any
same tell boy follow came show also around form three small set put end does another large must big even such here
why ask went men read need land different home move try kind hand picture again change off play spell air away animal
house point page letter mother answer found study still learn should world high every near add food between own below
country plant last school father keep tree never start city earth eye light thought head under story saw left few while
along might close something seem next hard open example begin life always those both paper together got group often run
important until children side feet car mile night walk white sea began grow took river four carry state once book hear
stop without second later miss idea enough eat face watch far real almost let above girl sometimes mountain cut young
talk soon list song being leave family quick brown fox jumps lazy dog`
  .split(/\s+/)
  .filter(Boolean);

const CONTRACTIONS = ["don't", "it's", "i'm", "can't", "won't", "you're", "that's", "we'll", "isn't", "they're"];

export interface TextOptions {
  count: number;
  punctuation: boolean;
  numbers: boolean;
  /** Relative chance of each word; without it every word is equally likely. */
  weigh?: (word: string) => number;
  rng?: () => number;
}

/** Picks from `words` in proportion to `weigh`, falling back to a uniform pick. */
function chooser(words: string[], rng: () => number, weigh?: (word: string) => number): () => string {
  if (!weigh) return () => words[Math.floor(rng() * words.length)];
  const cumulative: number[] = [];
  let total = 0;
  for (const w of words) cumulative.push((total += Math.max(weigh(w), 0)));
  return () => {
    const r = rng() * total;
    let lo = 0;
    let hi = cumulative.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid] > r) hi = mid;
      else lo = mid + 1;
    }
    return words[lo];
  };
}

export function generateText({ count, punctuation, numbers, weigh, rng = Math.random }: TextOptions): string {
  const word = chooser(WORDS, rng, weigh);
  const contraction = chooser(CONTRACTIONS, rng, weigh);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    let w: string;
    if (numbers && rng() < 0.12) w = String(Math.floor(rng() * 1000));
    else if (punctuation && rng() < 0.08) w = contraction();
    else w = word();
    if (punctuation && i < count - 1) {
      const r = rng();
      if (r < 0.1) w += ',';
      else if (r < 0.16) w += '.';
      else if (r < 0.18) w += '!';
      else if (r < 0.2) w += '?';
    }
    out.push(w);
  }
  return out.join(' ');
}

/** Normalise pasted text to what the layout can type: lowercase, single spaces, known characters only. */
export function sanitize(text: string, layout: Layout): string {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .split('')
    .filter((c) => layout.byChar.has(c))
    .join('')
    .trim();
}
