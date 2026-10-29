import { CustomerReview, SentimentClassification, SentimentSummary, TrainingExample } from '../types';
import { SENTIMENT_TRAINING_DATASET } from './dataset';

// Common English stopwords to ignore in classification
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were', 'will', 'with'
]);

// Strong sentiment anchors used for semantic keyword extraction
const POSITIVE_LEXICON = new Set([
  'excellent', 'outstanding', 'fresh', 'freshness', 'authentic', 'delighted', 'superb',
  'great', 'good', 'pure', 'delicious', 'clean', 'wholesome', 'satisfaction', 'satisfied',
  'creamy', 'rich', 'nutritional', 'smooth', 'natural', 'recommend', 'recommended', 'tasty',
  'sturdy', 'worth', 'pleasant', 'affordable', 'healthy', 'trustworthy', 'leak-proof', 'five'
]);

const NEGATIVE_LEXICON = new Set([
  'terrible', 'worst', 'poor', 'bad', 'disappointed', 'disappointing', 'stale', 'sour',
  'fake', 'diluted', 'waste', 'broken', 'damaged', 'leaked', 'spilled', 'overpriced',
  'horrible', 'chemical', 'artificial', 'expiry', 'expired', 'watery', 'cracked', 'burnt',
  'bitter', 'declined', 'trash', 'disgusting', 'rancid', 'substandard', 'unsafe', 'defective'
]);

class NaiveBayesClassifier {
  private classDocCounts: Record<string, number> = { Positive: 0, Negative: 0, Neutral: 0 };
  private classWordCounts: Record<string, number> = { Positive: 0, Negative: 0, Neutral: 0 };
  private wordFrequencies: Record<string, Record<string, number>> = {
    Positive: {},
    Negative: {},
    Neutral: {}
  };
  private vocabulary: Set<string> = new Set();
  private totalDocs: number = 0;

  constructor() {
    this.train(SENTIMENT_TRAINING_DATASET);
  }

  // Tokenize text into unigrams & bigrams with negation handling
  public tokenize(text: string): string[] {
    const cleaned = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const rawWords = cleaned.split(' ');
    const tokens: string[] = [];
    let isNegated = false;

    for (let i = 0; i < rawWords.length; i++) {
      const word = rawWords[i];
      if (!word) continue;

      if (['not', 'no', 'never', "didn't", "wasn't", 'without', 'hardly'].includes(word)) {
        isNegated = true;
        continue;
      }

      if (['but', 'however', 'although', '.', ',', ';'].includes(word)) {
        isNegated = false;
      }

      const token = isNegated ? `not_${word}` : word;
      if (!STOPWORDS.has(word) || isNegated) {
        tokens.push(token);
      }

      // Add bigram feature for contextual pairs
      if (i > 0) {
        const prev = rawWords[i - 1];
        if (!STOPWORDS.has(prev) && !STOPWORDS.has(word)) {
          tokens.push(`${prev}_${word}`);
        }
      }
    }

    return tokens;
  }

  // Train the model on the labeled dataset
  public train(dataset: TrainingExample[]): void {
    this.totalDocs = dataset.length;
    this.classDocCounts = { Positive: 0, Negative: 0, Neutral: 0 };
    this.classWordCounts = { Positive: 0, Negative: 0, Neutral: 0 };
    this.wordFrequencies = { Positive: {}, Negative: {}, Neutral: {} };
    this.vocabulary.clear();

    for (const example of dataset) {
      const label = example.label;
      this.classDocCounts[label] = (this.classDocCounts[label] || 0) + 1;

      const tokens = this.tokenize(example.text);
      for (const token of tokens) {
        this.vocabulary.add(token);
        this.wordFrequencies[label][token] = (this.wordFrequencies[label][token] || 0) + 1;
        this.classWordCounts[label] = (this.classWordCounts[label] || 0) + 1;
      }
    }
  }

  // Classify a single review with Laplace smoothing and rating integration
  public classify(text: string, rating?: number): SentimentClassification {
    const tokens = this.tokenize(text);
    const classes = ['Positive', 'Negative', 'Neutral'] as const;
    const scores: Record<'Positive' | 'Negative' | 'Neutral', number> = {
      Positive: 0,
      Negative: 0,
      Neutral: 0
    };

    const vocabSize = Math.max(1, this.vocabulary.size);

    for (const c of classes) {
      // Prior probability log P(C)
      const prior = Math.log((this.classDocCounts[c] + 1) / (this.totalDocs + classes.length));
      let logLikelihood = prior;

      // Conditional probabilities log P(w|C) with Laplace add-1 smoothing
      for (const token of tokens) {
        const count = this.wordFrequencies[c][token] || 0;
        const prob = (count + 1) / (this.classWordCounts[c] + vocabSize);
        logLikelihood += Math.log(prob);
      }

      // Prior star rating adjustment if rating provided (1-2 leans Negative, 4-5 leans Positive)
      if (typeof rating === 'number') {
        if (rating >= 4 && c === 'Positive') logLikelihood += 1.8;
        if (rating <= 2 && c === 'Negative') logLikelihood += 1.8;
        if (rating === 3 && c === 'Neutral') logLikelihood += 1.2;
      }

      scores[c] = logLikelihood;
    }

    // Convert log-likelihoods to normalized softmax confidence probabilities
    const maxLog = Math.max(scores.Positive, scores.Negative, scores.Neutral);
    const expPos = Math.exp(scores.Positive - maxLog);
    const expNeg = Math.exp(scores.Negative - maxLog);
    const expNeu = Math.exp(scores.Neutral - maxLog);
    const sumExp = expPos + expNeg + expNeu;

    const probPos = expPos / sumExp;
    const probNeg = expNeg / sumExp;
    const probNeu = expNeu / sumExp;

    let predicted: 'Positive' | 'Negative' | 'Neutral' = 'Neutral';
    let confidence = probNeu;

    if (probPos >= probNeg && probPos >= probNeu) {
      predicted = 'Positive';
      confidence = probPos;
    } else if (probNeg >= probPos && probNeg >= probNeu) {
      predicted = 'Negative';
      confidence = probNeg;
    }

    // Extract prominent keywords
    const keywords: string[] = [];
    tokens.forEach((t) => {
      const clean = t.replace('not_', '');
      if (POSITIVE_LEXICON.has(clean) || NEGATIVE_LEXICON.has(clean)) {
        if (!keywords.includes(clean)) keywords.push(clean);
      }
    });

    const netScore = Math.round((probPos - probNeg) * 100) / 100;

    return {
      sentiment: predicted,
      score: netScore, // -1.0 to +1.0
      confidence: Math.round(confidence * 100),
      keywords: keywords.slice(0, 5)
    };
  }
}

// Singleton classifier instance
export const sentimentClassifier = new NaiveBayesClassifier();

// Helper to classify review object
export function classifyReview(text: string, rating?: number): SentimentClassification {
  return sentimentClassifier.classify(text, rating);
}

// Aggregate metrics across a list of reviews
export function analyzeReviewBatch(reviews: CustomerReview[]): SentimentSummary {
  if (!reviews || reviews.length === 0) {
    return {
      total: 0,
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
      positive: 0,
      negative: 0,
      neutral: 0,
      positivePercentage: 0,
      negativePercentage: 0,
      neutralPercentage: 0,
      averageScore: 0
    };
  }

  let pos = 0;
  let neg = 0;
  let neu = 0;
  let scoreSum = 0;

  for (const r of reviews) {
    const classification = r.sentiment
      ? { sentiment: r.sentiment, score: r.sentimentScore ?? (r.sentiment === 'Positive' ? 0.8 : r.sentiment === 'Negative' ? -0.8 : 0) }
      : classifyReview(r.comment, r.rating);

    if (classification.sentiment === 'Positive') pos++;
    else if (classification.sentiment === 'Negative') neg++;
    else neu++;

    scoreSum += classification.score;
  }

  const total = reviews.length;
  return {
    total,
    positiveCount: pos,
    negativeCount: neg,
    neutralCount: neu,
    positive: pos,
    negative: neg,
    neutral: neu,
    positivePercentage: Math.round((pos / total) * 100),
    negativePercentage: Math.round((neg / total) * 100),
    neutralPercentage: Math.round((neu / total) * 100),
    averageScore: Math.round((scoreSum / total) * 100) / 100
  };
}

export function getTrainingDataset(): TrainingExample[] {
  return SENTIMENT_TRAINING_DATASET;
}
