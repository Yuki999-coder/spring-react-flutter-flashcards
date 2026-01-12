export interface Card {
  id: number;
  deckId: number;
  term: string;
  definition: string;
  example?: string;
  imageUrl?: string;
  audioUrl?: string;
  position: number;
  tags: string[];
  learningState: "NEW" | "LEARNING_MCQ" | "LEARNING_TYPING" | "REVIEWING" | "RELEARNING";
  nextReview?: string;
  createdAt: string;
}

export interface CreateCardRequest {
  deckId: number;
  term: string;
  definition: string;
  example?: string;
}
