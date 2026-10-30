import model from "./classifier-model.json";

export type Department = "HR" | "IT" | "Finance" | "Operations";
export const REVIEW_THRESHOLD = 0.6;

type ClassifierModel = {
  modelVersion: string;
import model from "../../ml/model/classifier-model.json";

// Routes a request to a department with the trained model (S1-21).
// The model is TF-IDF + logistic regression, trained in Python (ml/train_classifier.py)
// and saved as JSON. This file repeats the same maths in TypeScript, so there's
// no Python server: it runs inside the Next.js server in a few milliseconds.

export type Department = "HR" | "IT" | "Finance" | "Operations";

export type Classification = {
  department: Department;
  confidence: number; // 0 to 1
  needsReview: boolean; // true when confidence < 0.6 (S1-25)
  modelVersion: string;
};

export const REVIEW_THRESHOLD = 0.6;

type Model = {
  version: string;
  classes: Department[];
  preprocessing: {
    lowercase: boolean;
    token_pattern: string; // Python regex, e.g. \b[a-z][a-z]+\b
    ngram_range: [number, number];
    sublinear_tf: boolean;
    norm: "l2" | null;
  };
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
};

const m = model as unknown as Model;
const vocabulary = new Map(Object.entries(m.vocabulary));
const [minN, maxN] = m.preprocessing.ngram_range;

// Python's \b counts any letter, digit or "_" (in any language) as part of a word;
// JavaScript's \b only knows English letters. Spelling the boundary out keeps the
// two identical, so "café" or "covid19" are split the same way as in training.
const boundaryPattern = m.preprocessing.token_pattern.replace(/^\\b/, "").replace(/\\b$/, "");
const TOKEN = new RegExp(`(?<![\\p{L}\\p{N}_])${boundaryPattern}(?![\\p{L}\\p{N}_])`, "gu");

// 1. Text → words → word pairs, exactly like scikit-learn's TfidfVectorizer.
function terms(text: string): string[] {
  const clean = m.preprocessing.lowercase ? text.toLowerCase() : text;
  const words = clean.match(TOKEN) ?? [];
  const out: string[] = [];
  for (let n = minN; n <= maxN; n++) {
    for (let i = 0; i + n <= words.length; i++) out.push(words.slice(i, i + n).join(" "));
  }
  return out;
}

export function classify(subject: string, description: string): Classification {
  // 2. Count the words the model knows (unknown words are ignored, as in training).
  const counts = new Map<number, number>();
  for (const term of terms(`${subject}. ${description}`)) {
    const index = vocabulary.get(term);
    if (index !== undefined) counts.set(index, (counts.get(index) ?? 0) + 1);
  }

  // 3. TF-IDF weight per word, then scale so the weights' lengths add up to 1 (L2 norm).
  const weights = new Map<number, number>();
  let sumSquares = 0;
  for (const [index, count] of counts) {
    const tf = m.preprocessing.sublinear_tf ? 1 + Math.log(count) : count;
    const w = tf * m.idf[index];
    weights.set(index, w);
    sumSquares += w * w;
  }
  const norm = m.preprocessing.norm === "l2" && sumSquares > 0 ? Math.sqrt(sumSquares) : 1;

  // 4. One score per department, then softmax turns the scores into probabilities.
  const scores = m.classes.map((_, c) => {
    let s = m.intercept[c];
    for (const [index, w] of weights) s += m.coef[c][index] * (w / norm);
    return s;
  });
  const top = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - top));
  const total = exps.reduce((a, b) => a + b, 0);
  const probs = exps.map((e) => e / total);

  const best = probs.indexOf(Math.max(...probs));
  const confidence = probs[best];

  const probabilities = exps.map((e) => e / total);

  const best = probabilities.indexOf(Math.max(...probabilities));
  const confidence = Math.round(probabilities[best] * 1000) / 1000;
  return {
    department: m.classes[best],
    confidence,
    needsReview: confidence < REVIEW_THRESHOLD,
    modelVersion: m.modelVersion,
  };
}
    modelVersion: m.version,
  };
}
