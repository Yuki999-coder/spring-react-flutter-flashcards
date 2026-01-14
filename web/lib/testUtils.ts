import { Card } from "@/types/card";

export type QuestionType = "MCQ" | "WRITTEN" | "TRUE_FALSE";

export interface TestQuestion {
  id: string;
  type: QuestionType;
  cardId: number;
  question: string;
  correctAnswer: string;
  options?: string[]; // For MCQ
  correctIndex?: number; // For MCQ
  isTrue?: boolean; // For TRUE_FALSE
  userAnswer?: string | number | boolean;
}

export interface TestConfig {
  numberOfQuestions: number;
  includeTypes: {
    mcq: boolean;
    written: boolean;
    trueFalse: boolean;
  };
}

export interface TestResult {
  totalQuestions: number;
  correctAnswers: number;
  score: number; // Percentage
  questions: TestQuestion[];
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate Multiple Choice Question
 */
function generateMCQ(card: Card, allCards: Card[]): TestQuestion {
  const correctAnswer = card.definition;

  // Get wrong answers from other cards
  const otherCards = allCards.filter((c) => c.id !== card.id);
  const wrongAnswers = shuffle(otherCards)
    .slice(0, Math.min(3, otherCards.length))
    .map((c) => c.definition);

  // Combine and shuffle options
  const options = shuffle([correctAnswer, ...wrongAnswers]);
  const correctIndex = options.indexOf(correctAnswer);

  return {
    id: `mcq-${card.id}`,
    type: "MCQ",
    cardId: card.id,
    question: card.term,
    correctAnswer,
    options,
    correctIndex,
  };
}

/**
 * Generate Written Question
 */
function generateWritten(card: Card): TestQuestion {
  return {
    id: `written-${card.id}`,
    type: "WRITTEN",
    cardId: card.id,
    question: card.definition,
    correctAnswer: card.term,
  };
}

/**
 * Generate True/False Question
 */
function generateTrueFalse(card: Card, allCards: Card[]): TestQuestion {
  const isTrue = Math.random() < 0.5;

  if (isTrue) {
    // Correct pair
    return {
      id: `tf-${card.id}`,
      type: "TRUE_FALSE",
      cardId: card.id,
      question: card.term,
      correctAnswer: card.definition,
      isTrue: true,
    };
  } else {
    // Wrong pair - use random definition from another card
    const otherCards = allCards.filter((c) => c.id !== card.id);
    if (otherCards.length === 0) {
      // Fallback: make it true if no other cards
      return {
        id: `tf-${card.id}`,
        type: "TRUE_FALSE",
        cardId: card.id,
        question: card.term,
        correctAnswer: card.definition,
        isTrue: true,
      };
    }

    const randomCard =
      otherCards[Math.floor(Math.random() * otherCards.length)];

    return {
      id: `tf-${card.id}`,
      type: "TRUE_FALSE",
      cardId: card.id,
      question: card.term,
      correctAnswer: randomCard.definition, // Wrong definition
      isTrue: false,
    };
  }
}

/**
 * Generate test questions based on config
 */
export function generateTestQuestions(
  cards: Card[],
  config: TestConfig
): TestQuestion[] {
  if (cards.length === 0) return [];

  // Determine enabled question types
  const enabledTypes: QuestionType[] = [];
  if (config.includeTypes.mcq) enabledTypes.push("MCQ");
  if (config.includeTypes.written) enabledTypes.push("WRITTEN");
  if (config.includeTypes.trueFalse) enabledTypes.push("TRUE_FALSE");

  if (enabledTypes.length === 0) return [];

  // Determine number of questions
  const maxQuestions = Math.min(config.numberOfQuestions, cards.length);

  // Shuffle cards and select subset
  const selectedCards = shuffle(cards).slice(0, maxQuestions);

  // Generate questions
  const questions: TestQuestion[] = selectedCards.map((card, index) => {
    // Randomly select question type from enabled types
    const randomType =
      enabledTypes[Math.floor(Math.random() * enabledTypes.length)];

    switch (randomType) {
      case "MCQ":
        return generateMCQ(card, cards);
      case "WRITTEN":
        return generateWritten(card);
      case "TRUE_FALSE":
        return generateTrueFalse(card, cards);
      default:
        return generateMCQ(card, cards);
    }
  });

  return shuffle(questions);
}

/**
 * Check if written answer is correct
 * Strips HTML and normalizes text
 */
function checkWrittenAnswer(
  userAnswer: string,
  correctAnswer: string
): boolean {
  // Strip HTML tags
  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();

  // Normalize: lowercase, trim
  const normalize = (text: string) => stripHtml(text).toLowerCase().trim();

  return normalize(userAnswer) === normalize(correctAnswer);
}

/**
 * Grade test and calculate results
 */
export function gradeTest(questions: TestQuestion[]): TestResult {
  let correctCount = 0;

  const gradedQuestions = questions.map((question) => {
    let isCorrect = false;

    switch (question.type) {
      case "MCQ":
        isCorrect = question.userAnswer === question.correctIndex;
        break;

      case "WRITTEN":
        if (typeof question.userAnswer === "string") {
          isCorrect = checkWrittenAnswer(
            question.userAnswer,
            question.correctAnswer
          );
        }
        break;

      case "TRUE_FALSE":
        isCorrect = question.userAnswer === question.isTrue;
        break;
    }

    if (isCorrect) correctCount++;

    return question;
  });

  const score =
    questions.length > 0
      ? Math.round((correctCount / questions.length) * 100)
      : 0;

  return {
    totalQuestions: questions.length,
    correctAnswers: correctCount,
    score,
    questions: gradedQuestions,
  };
}

/**
 * Check if a specific answer is correct
 */
export function isAnswerCorrect(question: TestQuestion): boolean {
  switch (question.type) {
    case "MCQ":
      return question.userAnswer === question.correctIndex;

    case "WRITTEN":
      if (typeof question.userAnswer === "string") {
        return checkWrittenAnswer(question.userAnswer, question.correctAnswer);
      }
      return false;

    case "TRUE_FALSE":
      return question.userAnswer === question.isTrue;

    default:
      return false;
  }
}
