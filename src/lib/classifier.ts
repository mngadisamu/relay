import model from "./classifier-model.json";

export type Department = "HR" | "IT" | "Finance" | "Operations";
export const REVIEW_THRESHOLD = 0.6;

type ClassifierModel = {
  modelVersion: string;
  vocabulary: Record<string, number>;
  idf: number[];
  coef: number[][];
  intercept: number[];
  classes: Department[];
};

const m = model as unknown as ClassifierModel;

// Must match the Colab tokenizer: lowercase, then token_pattern [a-z0-9']+
function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9']+/g) ?? [];
}

export function classify(subject: string, description: string) {
  // Term counts for words in the vocabulary
  const counts = new Map<number, number>();
  for (const tok of tokenize(`${subject} ${description}`)) {
    const idx = m.vocabulary[tok];
    if (idx !== undefined) counts.set(idx, (counts.get(idx) ?? 0) + 1);
  }

  // TF-IDF weights, then L2 normalisation (sklearn defaults)
  const x = new Map<number, number>();
  let norm = 0;
  for (const [i, tf] of counts) {
    const w = tf * m.idf[i];
    x.set(i, w);
    norm += w * w;
  }
  norm = Math.sqrt(norm) || 1;

  // Logistic regression scores, then softmax for probabilities
  const scores = m.coef.map((row, c) => {
    let s = m.intercept[c];
    for (const [i, w] of x) s += row[i] * (w / norm);
    return s;
  });
  const top = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - top));
  const total = exps.reduce((a, b) => a + b, 0);
  const probs = exps.map((e) => e / total);

  const best = probs.indexOf(Math.max(...probs));
  const confidence = probs[best];

  return {
    department: m.classes[best],
    confidence,
    needsReview: confidence < REVIEW_THRESHOLD,
    modelVersion: m.modelVersion,
  };
}