import { Card } from "./card";

/**
 * Loại câu hỏi
 */
export type QuestionType = "MCQ" | "WRITTEN";

/**
 * Interface cho câu hỏi trắc nghiệm trong Learn Mode
 */
export interface MultipleChoiceQuestion {
  /** Loại câu hỏi */
  type: "MCQ";

  /** ID câu hỏi (dùng card.id) */
  id: number;

  /** Thuật ngữ - là câu hỏi */
  question: string;

  /** Đáp án đúng */
  correctAnswer: string;

  /** Mảng 4 đáp án (đã shuffle) */
  options: string[];

  /** Index của đáp án đúng trong mảng options */
  correctIndex: number;

  /** Ví dụ (nếu có) */
  example?: string;

  /** Card gốc (để hiển thị thêm thông tin nếu cần) */
  card: Card;
}

/**
 * Interface cho câu hỏi tự luận (gõ phím)
 */
export interface WrittenQuestion {
  /** Loại câu hỏi */
  type: "WRITTEN";

  /** ID câu hỏi (dùng card.id) */
  id: number;

  /** Định nghĩa - là câu hỏi */
  question: string;

  /** Term - là đáp án (người dùng phải gõ) */
  correctAnswer: string;

  /** Ví dụ (nếu có) */
  example?: string;

  /** Card gốc */
  card: Card;
}

/**
 * Union type cho tất cả các loại câu hỏi
 */
export type Question = MultipleChoiceQuestion | WrittenQuestion;

/**
 * Interface cho kết quả trả lời
 */
export interface AnswerResult {
  /** Có đúng không */
  isCorrect: boolean;

  /** Index đáp án người dùng chọn (cho MCQ) hoặc -1 (cho WRITTEN) */
  selectedIndex: number;

  /** Đáp án người dùng nhập (cho WRITTEN) */
  userAnswer?: string;

  /** Index đáp án đúng (cho MCQ) hoặc -1 (cho WRITTEN) */
  correctIndex: number;

  /** Câu hỏi tương ứng */
  question: Question;
}
