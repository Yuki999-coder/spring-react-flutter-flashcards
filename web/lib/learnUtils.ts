import { Card } from "@/types/card";
import {
  MultipleChoiceQuestion,
  WrittenQuestion,
  Question,
} from "@/types/learn";

/**
 * Shuffle mảng bằng Fisher-Yates algorithm
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
 * Tạo câu hỏi trắc nghiệm từ danh sách thẻ
 *
 * Logic:
 * 1. Với mỗi thẻ, lấy definition của nó làm đáp án đúng
 * 2. Lấy random 3 definition khác từ các thẻ còn lại làm đáp án sai
 * 3. Shuffle 4 đáp án
 * 4. Lưu lại index của đáp án đúng
 *
 * Edge Case:
 * - Nếu deck có < 4 thẻ: Lấy tất cả thẻ còn lại làm đáp án sai (không đủ 4 options)
 *
 * @param cards Danh sách thẻ trong deck
 * @returns Mảng câu hỏi trắc nghiệm đã shuffle
 */
export function generateMultipleChoiceQuestions(
  cards: Card[]
): MultipleChoiceQuestion[] {
  if (cards.length === 0) {
    return [];
  }

  const questions: MultipleChoiceQuestion[] = cards.map((card, index) => {
    // 1. Đáp án đúng là definition của thẻ hiện tại
    const correctAnswer = card.definition;

    // 2. Lấy các thẻ khác (loại trừ thẻ hiện tại)
    const otherCards = cards.filter((_, i) => i !== index);

    // 3. Lấy random tối đa 3 đáp án sai
    const wrongAnswers = shuffle(otherCards)
      .slice(0, Math.min(3, otherCards.length))
      .map((c) => c.definition);

    // 4. Kết hợp đáp án đúng và sai
    const allOptions = [correctAnswer, ...wrongAnswers];

    // 5. Shuffle vị trí các đáp án
    const shuffledOptions = shuffle(allOptions);

    // 6. Tìm index của đáp án đúng sau khi shuffle
    const correctIndex = shuffledOptions.indexOf(correctAnswer);

    return {
      type: "MCQ",
      id: card.id,
      question: card.term,
      correctAnswer,
      options: shuffledOptions,
      correctIndex,
      example: card.example || undefined,
      card,
    };
  });

  // 7. Shuffle thứ tự câu hỏi
  return shuffle(questions);
}

/**
 * Tạo câu hỏi tự luận (gõ phím) từ danh sách thẻ
 *
 * Logic:
 * - Câu hỏi: Definition (+ image nếu có)
 * - Đáp án: Term (người dùng phải gõ chính xác)
 *
 * @param cards Danh sách thẻ trong deck
 * @returns Mảng câu hỏi tự luận đã shuffle
 */
export function generateWrittenQuestions(cards: Card[]): WrittenQuestion[] {
  if (cards.length === 0) {
    return [];
  }

  const questions: WrittenQuestion[] = cards.map((card) => ({
    type: "WRITTEN",
    id: card.id,
    question: card.definition,
    correctAnswer: card.term,
    example: card.example || undefined,
    card,
  }));

  return shuffle(questions);
}

/**
 * Tạo câu hỏi hỗn hợp (random MCQ và WRITTEN)
 *
 * @param cards Danh sách thẻ trong deck
 * @returns Mảng câu hỏi hỗn hợp đã shuffle
 */
export function generateMixedQuestions(cards: Card[]): Question[] {
  if (cards.length === 0) {
    return [];
  }

  const questions: Question[] = cards.map((card, index) => {
    // Random 50/50 giữa MCQ và WRITTEN
    const isMCQ = Math.random() < 0.5;

    if (isMCQ) {
      // Tạo câu MCQ
      const correctAnswer = card.definition;
      const otherCards = cards.filter((_, i) => i !== index);
      const wrongAnswers = shuffle(otherCards)
        .slice(0, Math.min(3, otherCards.length))
        .map((c) => c.definition);
      const allOptions = [correctAnswer, ...wrongAnswers];
      const shuffledOptions = shuffle(allOptions);
      const correctIndex = shuffledOptions.indexOf(correctAnswer);

      return {
        type: "MCQ",
        id: card.id,
        question: card.term,
        correctAnswer,
        options: shuffledOptions,
        correctIndex,
        example: card.example || undefined,
        card,
      } as MultipleChoiceQuestion;
    } else {
      // Tạo câu WRITTEN
      return {
        type: "WRITTEN",
        id: card.id,
        question: card.definition,
        correctAnswer: card.term,
        example: card.example || undefined,
        card,
      } as WrittenQuestion;
    }
  });

  return shuffle(questions);
}

/**
 * Chuẩn hóa chuỗi để so sánh
 * - Trim khoảng trắng 2 đầu
 * - Chuyển về lowercase
 */
function normalizeString(str: string): string {
  return str.trim().toLowerCase();
}

/**
 * Kiểm tra đáp án tự luận có đúng không
 *
 * Logic:
 * - Strip HTML tags từ correctAnswer trước
 * - Trim khoảng trắng 2 đầu
 * - Case-insensitive (không phân biệt hoa thường)
 * - Ví dụ: " Apple " == "apple" -> TRUE
 * - Ví dụ: "<p>Apple</p>" và nhập "Apple" -> TRUE
 *
 * @param userInput Đáp án người dùng nhập
 * @param correctAnswer Đáp án đúng (có thể chứa HTML)
 * @returns true nếu đúng, false nếu sai
 */
export function checkWrittenAnswer(
  userInput: string,
  correctAnswer: string
): boolean {
  // Strip HTML từ correctAnswer trước khi so sánh
  const cleanCorrectAnswer = correctAnswer.replace(/<[^>]*>/g, "").trim();
  return normalizeString(userInput) === normalizeString(cleanCorrectAnswer);
}

/**
 * Kiểm tra đáp án có đúng không (cho cả MCQ và WRITTEN)
 */
export function checkAnswer(
  question: Question,
  selectedIndex?: number,
  userInput?: string
): boolean {
  if (question.type === "MCQ") {
    return selectedIndex === question.correctIndex;
  } else {
    return userInput
      ? checkWrittenAnswer(userInput, question.correctAnswer)
      : false;
  }
}

/**
 * Tính điểm phần trăm
 */
export function calculateScore(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}
