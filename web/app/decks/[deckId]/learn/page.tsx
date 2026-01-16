"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  XCircle,
  Trophy,
  PenTool,
  ListChecks,
  Shuffle,
  Volume2,
  Brain,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/useAuthStore";
import { Card } from "@/types/card";
import { Question, AnswerResult } from "@/types/learn";
import { stripHtml } from "@/lib/htmlUtils";
import { useTTS } from "@/hooks/use-tts";
import { useStudyTimer } from "@/hooks/useStudyTimer";
import { StudyMode } from "@/types/statistics";
import {
  generateMultipleChoiceQuestions,
  generateWrittenQuestions,
  generateMixedQuestions,
  checkAnswer,
  checkWrittenAnswer,
  calculateScore,
} from "@/lib/learnUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card as UICard,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  params: Promise<{ deckId: string }>;
}

export default function LearnModePage({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const [deckId, setDeckId] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerResult[]>([]);

  // For MCQ
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // For WRITTEN
  const [userInput, setUserInput] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrectAnswer, setIsCorrectAnswer] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedMode, setSelectedMode] = useState<
    "MCQ" | "WRITTEN" | "MIXED" | "FLASHCARD" | null
  >(null);
  const [isComplete, setIsComplete] = useState(false);
  
  // Flashcard mode states
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardAnswers, setFlashcardAnswers] = useState<{ cardId: number; known: boolean }[]>([]);
  
  // Cram mode (review wrong cards from test)
  const [isCramMode, setIsCramMode] = useState(false);
  const [cramCardCount, setCramCardCount] = useState(0);

  const masteryParamRaw = searchParams.get("mastery");
  const masteryParam = ["new", "learning", "almost", "mastered"].includes(
    masteryParamRaw || ""
  )
    ? masteryParamRaw
    : null;

  // TTS Hook
  const { speak } = useTTS();

  // Study Timer Hook - Track time spent in learn mode
  const { elapsedSeconds, incrementCardsStudied, stopTracking } = useStudyTimer({
    mode: StudyMode.LEARN,
    deckId: deckId ? parseInt(deckId) : undefined,
    enabled: hasStarted && !isComplete && deckId !== null,
  });

  // Helper function to record progress to SRS
  const recordProgressToSRS = async (cardId: number, mode: "MCQ" | "WRITTEN" | "MIXED", isCorrect: boolean) => {
    try {
      await api.post(`/cards/${cardId}/record-progress`, {
        mode,
        isCorrect,
      });
      console.log(`✅ SRS Updated: Card ${cardId}, Mode: ${mode}, Correct: ${isCorrect}`);
    } catch (error: any) {
      console.error("Failed to record progress to SRS:", error);
      // Don't show error toast to avoid interrupting user flow
      // The study session will still continue
    }
  };

  const getCardMasteryLevel = (card: Card): "new" | "learning" | "almost" | "mastered" => {
    if (!card.learningState || card.learningState === "NEW") return "new";
    if (
      card.learningState === "LEARNING_MCQ" ||
      card.learningState === "LEARNING_TYPING" ||
      card.learningState === "RELEARNING"
    ) {
      return "learning";
    }
    if (card.learningState === "REVIEWING" && card.interval !== undefined) {
      // Use interval instead of calculating from nextReview
      const interval = card.interval;
      if (interval >= 21) {
        return "mastered";
      } else if (interval >= 3) {
        return "almost";
      } else {
        return "learning"; // < 3 days = still learning
      }
    }
    return "new";
  };

  const getMasteryLabel = (value: string): string => {
    switch (value) {
      case "new":
        return "New Cards";
      case "learning":
        return "Still Learning";
      case "almost":
        return "Almost Done";
      case "mastered":
        return "Mastered";
      default:
        return "Mastery";
    }
  };

  useEffect(() => {
    const initPage = async () => {
      if (!isAuthenticated()) {
        router.push("/login");
        return;
      }

      const resolvedParams = await params;
      setDeckId(resolvedParams.deckId);
    };

    initPage();
  }, [params, isAuthenticated, router]);

  useEffect(() => {
    if (deckId) {
      fetchCards();
    }
  }, [deckId, masteryParam]);

  // Auto-focus khi chuyển câu trong WRITTEN mode
  useEffect(() => {
    if (
      hasStarted &&
      questions[currentIndex]?.type === "WRITTEN" &&
      !showFeedback
    ) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentIndex, hasStarted, showFeedback, questions]);

  const fetchCards = async () => {
    if (!deckId) return;

    setIsLoading(true);
    try {
      // Check if we're in cram mode (reviewing wrong cards from test)
      const cramCardIdsStr = sessionStorage.getItem("cram_card_ids");
      
      if (cramCardIdsStr) {
        // Cram mode: Load only specific cards
        const cramCardIds: number[] = JSON.parse(cramCardIdsStr);
        
        // Fetch all cards first
        const response = await api.get(`/decks/${deckId}/cards`);
        const allCards = response.data as Card[];
        
        // Filter to only wrong cards
        const wrongCards = allCards.filter((card) =>
          cramCardIds.includes(card.id)
        );

        if (wrongCards.length === 0) {
          toast.error("Không tìm thấy thẻ nào để ôn tập!");
          router.push(`/decks/${deckId}`);
          return;
        }

        setCards(wrongCards);
        setIsCramMode(true);
        setCramCardCount(wrongCards.length);
        
        // Clear sessionStorage after loading
        sessionStorage.removeItem("cram_card_ids");
        
        // Show notification
        toast.success(`Đang ôn tập ${wrongCards.length} câu làm sai`, {
          duration: 3000,
        });
      } else {
        // Normal mode: Load all cards
        const response = await api.get(`/decks/${deckId}/cards`);
        const fetchedCards = response.data as Card[];

        if (fetchedCards.length === 0) {
          toast.error("Bộ thẻ này chưa có thẻ nào!");
          router.push(`/decks/${deckId}`);
          return;
        }

        let filteredCards = fetchedCards;

        if (masteryParam) {
          filteredCards = fetchedCards.filter((card) => {
            const level = getCardMasteryLevel(card);
            return level === masteryParam;
          });

          if (filteredCards.length === 0) {
            toast.error("Không có thẻ phù hợp với mức độ này");
            router.push(`/decks/${deckId}`);
            return;
          }

          const label = getMasteryLabel(masteryParam);
          toast.success(`Đang học ${filteredCards.length} thẻ "${label}"`, {
            duration: 3000,
          });
        }

        setCards(filteredCards);
        setIsCramMode(false);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Không thể tải dữ liệu";
      toast.error(message);
      router.push(`/decks/${deckId}`);
    } finally {
      setIsLoading(false);
    }
  };

  const startMode = (mode: "MCQ" | "WRITTEN" | "MIXED" | "FLASHCARD") => {
    if (mode === "FLASHCARD") {
      // Flashcard mode doesn't need questions generation
      setSelectedMode(mode);
      setHasStarted(true);
      setCurrentIndex(0);
      setIsFlipped(false);
      setFlashcardAnswers([]);
      return;
    }

    let generatedQuestions: Question[];

    if (mode === "MCQ") {
      generatedQuestions = generateMultipleChoiceQuestions(cards);
    } else if (mode === "WRITTEN") {
      generatedQuestions = generateWrittenQuestions(cards);
    } else {
      generatedQuestions = generateMixedQuestions(cards);
    }

    setQuestions(generatedQuestions);
    setSelectedMode(mode);
    setHasStarted(true);
  };

  // Handler for MCQ
  const handleSelectOption = (optionIndex: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(optionIndex);
  };

  const handleNextMCQ = async () => {
    if (selectedOption === null) {
      toast.error("Vui lòng chọn đáp án!");
      return;
    }

    const currentQuestion = questions[currentIndex];
    const isCorrect = checkAnswer(currentQuestion, selectedOption);

    const result: AnswerResult = {
      isCorrect,
      selectedIndex: selectedOption,
      correctIndex:
        currentQuestion.type === "MCQ" ? currentQuestion.correctIndex : -1,
      question: currentQuestion,
    };
    setAnswers([...answers, result]);

    // Track card as studied
    incrementCardsStudied(currentQuestion.card.id);

    // 🔥 NEW: Record progress to SRS system
    // Detect actual mode: if selectedMode is MIXED, pass MIXED; otherwise pass selectedMode
    const progressMode = selectedMode === "MIXED" ? "MIXED" : "MCQ";
    await recordProgressToSRS(currentQuestion.card.id, progressMode, isCorrect);

    if (isCorrect) {
      toast.success("Chính xác! 🎉");
    } else {
      toast.error("Sai rồi! Đáp án đúng: " + currentQuestion.correctAnswer);
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
    } else {
      setIsComplete(true);
      await stopTracking(); // Save study session
      triggerConfetti();
    }
  };

  // Handler for WRITTEN
  const handleCheckWritten = () => {
    if (!userInput.trim()) {
      toast.error("Vui lòng nhập đáp án!");
      return;
    }

    const currentQuestion = questions[currentIndex];
    const isCorrect = checkWrittenAnswer(
      userInput,
      currentQuestion.correctAnswer
    );

    setIsCorrectAnswer(isCorrect);
    setShowFeedback(true);
  };

  const handleContinueWritten = async () => {
    const currentQuestion = questions[currentIndex];

    // Track card as studied
    incrementCardsStudied(currentQuestion.card.id);

    // 🔥 NEW: Record progress to SRS system
    // Detect actual mode: if selectedMode is MIXED, pass MIXED; otherwise pass WRITTEN
    const progressMode = selectedMode === "MIXED" ? "MIXED" : "WRITTEN";
    await recordProgressToSRS(currentQuestion.card.id, progressMode, isCorrectAnswer);

    const result: AnswerResult = {
      isCorrect: isCorrectAnswer,
      selectedIndex: -1,
      userAnswer: userInput,
      correctIndex: -1,
      question: currentQuestion,
    };
    setAnswers([...answers, result]);

    if (isCorrectAnswer) {
      toast.success("Chính xác! 🎉");
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserInput("");
      setShowFeedback(false);
    } else {
      setIsComplete(true);
      await stopTracking(); // Save study session
      triggerConfetti();
    }
  };

  // Handle Enter key for WRITTEN mode
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (showFeedback) {
        handleContinueWritten();
      } else {
        handleCheckWritten();
      }
    }
  };

  // Flashcard mode handlers
  const handleFlipCard = () => {
    setIsFlipped(!isFlipped);
  };

  const handleFlashcardAnswer = async (known: boolean) => {
    const currentCard = cards[currentIndex];
    
    // Track card as studied
    incrementCardsStudied(currentCard.id);
    
    // Save answer
    setFlashcardAnswers([...flashcardAnswers, { cardId: currentCard.id, known }]);
    
    // Move to next card or complete
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    } else {
      setIsComplete(true);
      await stopTracking(); // Save study session
      triggerConfetti();
    }
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setAnswers([]);
    setSelectedOption(null);
    setUserInput("");
    setShowFeedback(false);
    setIsComplete(false);
    setHasStarted(false);
    setSelectedMode(null);
  };

  // Loading screen
  if (!deckId || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <header className="border-b bg-white/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-96 w-full max-w-2xl mx-auto" />
        </main>
      </div>
    );
  }

  // Start screen - Chọn chế độ
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <header className="border-b bg-white/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/decks/${deckId}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại
            </Button>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-2">Chọn chế độ học</h1>
              <p className="text-muted-foreground">
                Chọn một trong các chế độ học bên dưới
              </p>
              {isCramMode && (
                <div className="mt-4 inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-4 py-2 rounded-full">
                  <Brain className="w-4 h-4" />
                  <span className="font-medium">
                    Đang ôn tập {cramCardCount} câu làm sai
                  </span>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {/* MCQ Mode */}
              <UICard
                className="cursor-pointer hover:shadow-xl transition-all hover:border-primary"
                onClick={() => startMode("MCQ")}
              >
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-blue-100 dark:bg-blue-950 rounded-full">
                      <ListChecks className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <CardTitle>Trắc nghiệm</CardTitle>
                  <CardDescription>Multiple Choice Questions</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>✓ Chọn đáp án đúng từ 4 lựa chọn</li>
                    <li>✓ Nhanh chóng và dễ dàng</li>
                    <li>✓ Phù hợp ôn tập nhanh</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant="outline">
                    Bắt đầu
                  </Button>
                </CardFooter>
              </UICard>

              {/* WRITTEN Mode */}
              <UICard
                className="cursor-pointer hover:shadow-xl transition-all hover:border-primary"
                onClick={() => startMode("WRITTEN")}
              >
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-green-100 dark:bg-green-950 rounded-full">
                      <PenTool className="h-12 w-12 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <CardTitle>Gõ phím</CardTitle>
                  <CardDescription>Typing / Written</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>✓ Gõ đáp án chính xác</li>
                    <li>✓ Rèn kỹ năng chính tả</li>
                    <li>✓ Nhớ lâu hơn</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant="outline">
                    Bắt đầu
                  </Button>
                </CardFooter>
              </UICard>

              {/* MIXED Mode */}
              <UICard
                className="cursor-pointer hover:shadow-xl transition-all hover:border-primary"
                onClick={() => startMode("MIXED")}
              >
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-purple-100 dark:bg-purple-950 rounded-full">
                      <Shuffle className="h-12 w-12 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <CardTitle>Hỗn hợp</CardTitle>
                  <CardDescription>Mixed Mode</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>✓ Kết hợp cả 2 chế độ</li>
                    <li>✓ Random câu hỏi</li>
                    <li>✓ Thử thách toàn diện</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant="outline">
                    Bắt đầu
                  </Button>
                </CardFooter>
              </UICard>
              {/* FLASHCARD Mode */}
              <UICard
                className="cursor-pointer hover:shadow-xl transition-all hover:border-primary"
                onClick={() => startMode("FLASHCARD")}
              >
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-amber-100 dark:bg-amber-950 rounded-full">
                      <BookOpen className="h-12 w-12 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                  <CardTitle>Lật thẻ</CardTitle>
                  <CardDescription>Flashcard Review</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>✓ Lật thẻ để xem đáp án</li>
                    <li>✓ Đánh giá mức độ nhớ</li>
                    <li>✓ Ôn tập trực quan</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant="outline">
                    Bắt đầu
                  </Button>
                </CardFooter>
              </UICard>            </div>
          </div>
        </main>
      </div>
    );
  }

  // Completion screen
  if (isComplete) {
    let correctCount = 0;
    let totalCount = 0;
    let score = 0;

    if (selectedMode === "FLASHCARD") {
      // For flashcard mode
      correctCount = flashcardAnswers.filter((a) => a.known).length;
      totalCount = flashcardAnswers.length;
      score = calculateScore(correctCount, totalCount);
    } else {
      // For MCQ/WRITTEN/MIXED modes
      correctCount = answers.filter((a) => a.isCorrect).length;
      totalCount = answers.length;
      score = calculateScore(correctCount, totalCount);
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <header className="border-b bg-white/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/decks/${deckId}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại
            </Button>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <UICard className="max-w-2xl mx-auto text-center">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <Trophy className="h-20 w-20 text-yellow-500" />
              </div>
              <CardTitle className="text-3xl">Hoàn thành!</CardTitle>
              <CardDescription className="text-lg">
                Bạn đã học xong {totalCount} thẻ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-6xl font-bold text-primary">{score}%</div>
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium">Đúng</span>
                  </div>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {correctCount}
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-medium">Sai</span>
                  </div>
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {totalCount - correctCount}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={() => router.push(`/decks/${deckId}`)}
              >
                Về trang chủ
              </Button>
              <Button onClick={handleRestart}>
                <BookOpen className="mr-2 h-4 w-4" />
                Học lại
              </Button>
            </CardFooter>
          </UICard>
        </main>
      </div>
    );
  }

  // Flashcard mode screen
  if (selectedMode === "FLASHCARD") {
    const currentCard = cards[currentIndex];
    const progress = ((currentIndex + 1) / cards.length) * 100;

    // Check if currentCard exists
    if (!currentCard) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">Đang tải...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/decks/${deckId}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại
            </Button>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-bold">Lật thẻ</h1>
                <Badge variant="secondary">
                  {currentIndex + 1} / {cards.length}
                </Badge>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            {/* Flashcard */}
            <div 
              className={`relative w-full h-96 cursor-pointer transition-all duration-500 transform-gpu ${
                isFlipped ? '[transform:rotateY(180deg)]' : ''
              }`}
              style={{ transformStyle: 'preserve-3d' }}
              onClick={handleFlipCard}
            >
              {/* Front side - Term */}
              <UICard 
                className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-2xl ${
                  isFlipped ? 'invisible' : 'visible'
                }`}
                style={{ backfaceVisibility: 'hidden' }}
              >
                <CardContent className="p-8 text-center">
                  {currentCard.imageUrl && (
                    <div className="relative w-full h-32 mb-6 rounded-lg overflow-hidden">
                      <Image
                        src={currentCard.imageUrl}
                        alt={currentCard.term}
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  <div 
                    className="text-4xl font-bold mb-2 prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: currentCard.term }}
                  />
                  <p className="text-blue-100 text-sm mt-4">Click để lật thẻ</p>
                </CardContent>
              </UICard>

              {/* Back side - Definition */}
              <UICard 
                className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-500 to-teal-600 text-white shadow-2xl ${
                  !isFlipped ? 'invisible' : 'visible'
                }`}
                style={{ 
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)'
                }}
              >
                <CardContent className="p-8 text-center">
                  <div 
                    className="text-3xl font-semibold mb-4 prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: currentCard.definition }}
                  />
                  {currentCard.example && (
                    <div 
                      className="text-sm text-green-100 italic mt-4 prose prose-sm prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: `Ví dụ: ${currentCard.example}` }}
                    />
                  )}
                  <p className="text-green-100 text-sm mt-6">Click để lật lại</p>
                </CardContent>
              </UICard>
            </div>

            {/* Action buttons - Only show when flipped */}
            {isFlipped && (
              <div className="mt-8 flex gap-4">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFlashcardAnswer(false);
                  }}
                  variant="outline"
                  size="lg"
                  className="flex-1 border-2 border-red-500 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="mr-2 h-5 w-5" />
                  Chưa nhớ
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFlashcardAnswer(true);
                  }}
                  variant="outline"
                  size="lg"
                  className="flex-1 border-2 border-green-500 text-green-600 hover:bg-green-50"
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Đã nhớ
                </Button>
              </div>
            )}

            {/* Stats */}
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>Đã nhớ: {flashcardAnswers.filter(a => a.known).length} / {flashcardAnswers.length}</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Main learning screen (MCQ/WRITTEN/MIXED)
  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/decks/${deckId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">
                  {currentQuestion.type === "MCQ" ? "Trắc nghiệm" : "Gõ phím"}
                </h1>
                {isCramMode && (
                  <Badge variant="destructive" className="bg-orange-500">
                    <Brain className="w-3 h-3 mr-1" />
                    Ôn tập câu sai
                  </Badge>
                )}
              </div>
              <Badge variant="secondary">
                {currentIndex + 1} / {questions.length}
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <UICard className="max-w-3xl mx-auto">
          <CardHeader>
            {/* Hiển thị ảnh nếu có */}
            {currentQuestion.card.imageUrl && (
              <div className="relative w-full h-48 mb-4 rounded-lg overflow-hidden bg-muted">
                <Image
                  src={currentQuestion.card.imageUrl}
                  alt={currentQuestion.question}
                  fill
                  className="object-contain"
                />
              </div>
            )}

            <div className="flex items-start justify-center gap-3">
              <div
                className="text-2xl text-center font-semibold leading-none tracking-tight prose prose-lg max-w-none flex-1"
                dangerouslySetInnerHTML={{ __html: currentQuestion.question }}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => speak(currentQuestion.question, "en-US")}
                className="flex-shrink-0 hover:bg-primary/10 hover:text-primary transition-all"
                title="Nghe phát âm"
              >
                <Volume2 className="h-5 w-5" />
              </Button>
            </div>
            {currentQuestion.example && (
              <div className="text-sm text-muted-foreground text-center italic mt-2 prose prose-sm max-w-none mx-auto">
                Ví dụ:{" "}
                <span
                  dangerouslySetInnerHTML={{ __html: currentQuestion.example }}
                />
              </div>
            )}
          </CardHeader>

          {/* MCQ Content */}
          {currentQuestion.type === "MCQ" && (
            <>
              <CardContent className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = selectedOption === index;
                  const isCorrect = index === currentQuestion.correctIndex;
                  const showResult = selectedOption !== null;

                  let buttonClass =
                    "justify-start text-left h-auto py-4 px-6 text-base";

                  if (showResult) {
                    if (isCorrect) {
                      buttonClass +=
                        " bg-green-100 dark:bg-green-950 border-green-500 hover:bg-green-100 dark:hover:bg-green-950";
                    } else if (isSelected) {
                      buttonClass +=
                        " bg-red-100 dark:bg-red-950 border-red-500 hover:bg-red-100 dark:hover:bg-red-950";
                    }
                  } else if (isSelected) {
                    buttonClass += " border-primary bg-primary/5";
                  }

                  return (
                    <Button
                      key={index}
                      variant="outline"
                      className={buttonClass}
                      onClick={() => handleSelectOption(index)}
                      disabled={showResult}
                    >
                      <span className="font-semibold mr-3">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      <span className="flex-1">{stripHtml(option)}</span>
                      {showResult && isCorrect && (
                        <CheckCircle2 className="h-5 w-5 text-green-600 ml-2" />
                      )}
                      {showResult && isSelected && !isCorrect && (
                        <XCircle className="h-5 w-5 text-red-600 ml-2" />
                      )}
                    </Button>
                  );
                })}
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={handleNextMCQ}
                  disabled={selectedOption === null}
                >
                  {currentIndex < questions.length - 1
                    ? "Câu tiếp theo"
                    : "Hoàn thành"}
                </Button>
              </CardFooter>
            </>
          )}

          {/* WRITTEN Content */}
          {currentQuestion.type === "WRITTEN" && (
            <>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Nhập đáp án của bạn..."
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={showFeedback}
                    className="text-lg py-6"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nhấn Enter hoặc nút bên dưới để kiểm tra
                  </p>
                </div>

                {/* Feedback khi đã check */}
                {showFeedback && (
                  <div
                    className={`p-4 rounded-lg border-2 ${
                      isCorrectAnswer
                        ? "bg-green-50 dark:bg-green-950 border-green-500"
                        : "bg-red-50 dark:bg-red-950 border-red-500"
                    }`}
                  >
                    {isCorrectAnswer ? (
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <CheckCircle2 className="h-6 w-6" />
                        <div>
                          <p className="font-semibold">Chính xác! 🎉</p>
                          <p className="text-sm">Bạn đã trả lời đúng</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                          <XCircle className="h-6 w-6" />
                          <p className="font-semibold">Chưa chính xác</p>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Bạn trả lời:
                            </p>
                            <p className="font-medium text-red-700 dark:text-red-300">
                              {userInput}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Đáp án đúng:
                            </p>
                            <p className="font-medium text-green-700 dark:text-green-300">
                              {stripHtml(currentQuestion.correctAnswer)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                {!showFeedback ? (
                  <Button
                    className="w-full"
                    onClick={handleCheckWritten}
                    disabled={!userInput.trim()}
                  >
                    Kiểm tra
                  </Button>
                ) : (
                  <Button className="w-full" onClick={handleContinueWritten}>
                    {currentIndex < questions.length - 1
                      ? "Câu tiếp theo"
                      : "Hoàn thành"}
                  </Button>
                )}
              </CardFooter>
            </>
          )}
        </UICard>
      </main>
    </div>
  );
}
