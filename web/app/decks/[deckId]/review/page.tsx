"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Trophy, Flame } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/useAuthStore";
import { Card } from "@/types/card";
import { useStudyTimer } from "@/hooks/useStudyTimer";
import { StudyMode } from "@/types/statistics";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Flashcard } from "@/components/Flashcard";
import { ReviewControls } from "@/components/ReviewControls";

interface PageProps {
  params: Promise<{ deckId: string }>;
}

export default function ReviewPage({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const [deckId, setDeckId] = useState<string | null>(null);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [dueCards, setDueCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [hasShownConfetti, setHasShownConfetti] = useState(false);
  const [isCramMode, setIsCramMode] = useState(false);

  // Study Timer Hook - Track time spent in SRS review mode
  const { elapsedSeconds, incrementCardsStudied } = useStudyTimer({
    mode: StudyMode.SRS,
    deckId: deckId ? parseInt(deckId) : undefined,
    enabled: isReviewing && deckId !== null,
  });

  useEffect(() => {
    const initPage = async () => {
      if (!isAuthenticated()) {
        router.push("/login");
        return;
      }

      const resolvedParams = await params;
      setDeckId(resolvedParams.deckId);
      
      // Check mode: difficult or wrongCards
      const mode = searchParams.get("mode");
      setIsCramMode(mode === "difficult" || mode === "wrongCards");
      
      // If wrongCards mode, load from sessionStorage
      if (mode === "wrongCards") {
        const storedCards = sessionStorage.getItem("cramCards");
        if (storedCards) {
          const wrongCards = JSON.parse(storedCards) as Card[];
          setAllCards(wrongCards);
          setDueCards(wrongCards);
          setIsLoading(false);
          
          // Clear sessionStorage after loading
          sessionStorage.removeItem("cramCards");
          
          if (wrongCards.length === 0) {
            toast.info("Không có thẻ nào để học lại!");
          }
          
          return; // Skip fetchCards
        }
      }
    };

    initPage();
  }, [params, isAuthenticated, router, searchParams]);

  useEffect(() => {
    if (deckId) {
      fetchCards();
    }
  }, [deckId]);

  const fetchCards = async () => {
    if (!deckId) return;

    setIsLoading(true);
    try {
      // If cram mode, fetch difficult cards only
      const endpoint = isCramMode 
        ? `/decks/${deckId}/cards/difficult`
        : `/decks/${deckId}/cards`;
      
      const response = await api.get(endpoint);
      const cards: Card[] = response.data;

      console.log(`${isCramMode ? 'Difficult' : 'All'} cards from API:`, cards);

      if (isCramMode) {
        // Cram mode: All fetched cards are difficult, show all
        setAllCards(cards);
        setDueCards(cards);
        
        if (cards.length === 0) {
          toast.info("Không có thẻ khó nào để ôn tập!");
        }
      } else {
        // Normal mode: Filter due cards
        const now = new Date();
        const due = cards.filter((card) => {
          if (!card.learningState) return true;
          if (card.learningState === "NEW") return true;
          if (card.nextReview) {
            const reviewDate = new Date(card.nextReview);
            return reviewDate <= now;
          }
          return false;
        });

        // Sort: NEW cards first, then by nextReview
        const sorted = due.sort((a, b) => {
          const aIsNew = !a.learningState || a.learningState === "NEW";
          const bIsNew = !b.learningState || b.learningState === "NEW";

          if (aIsNew && !bIsNew) return -1;
          if (!aIsNew && bIsNew) return 1;
          return 0;
        });

        console.log("Due cards after filtering:", sorted.length);

        setAllCards(cards);
        setDueCards(sorted);

        if (sorted.length === 0) {
          toast.info("Không có thẻ nào cần ôn tập!");
        }
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Không thể tải thẻ";
      toast.error(message);
      router.push(`/decks/${deckId}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleReview = async (grade: "AGAIN" | "HARD" | "GOOD" | "EASY") => {
    const currentCard = dueCards[currentIndex];
    if (!currentCard) return;

    setIsReviewing(true);
    try {
      await api.post(`/cards/${currentCard.id}/review`, { grade });

      // Track card review
      incrementCardsStudied(currentCard.id);

      // Remove card from due list and move to next
      const newDueCards = dueCards.filter((_, index) => index !== currentIndex);
      setDueCards(newDueCards);
      setReviewedCount((prev) => prev + 1);
      setIsFlipped(false);

      // Check if session complete
      if (newDueCards.length === 0 && !hasShownConfetti) {
        setHasShownConfetti(true);
        triggerConfetti();
        toast.success("🎉 Chúc mừng! Bạn đã hoàn thành bài học!");
      } else if (currentIndex >= newDueCards.length && newDueCards.length > 0) {
        // If we're past the end, go back to last card
        setCurrentIndex(newDueCards.length - 1);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Không thể lưu kết quả";
      toast.error(message);
    } finally {
      setIsReviewing(false);
    }
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#3b82f6", "#8b5cf6", "#ec4899"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#3b82f6", "#8b5cf6", "#ec4899"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isLoading || isReviewing || dueCards.length === 0) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          handleFlip();
          break;
        case "1":
          if (isFlipped) handleReview("AGAIN");
          break;
        case "2":
          if (isFlipped) handleReview("HARD");
          break;
        case "3":
          if (isFlipped) handleReview("GOOD");
          break;
        case "4":
          if (isFlipped) handleReview("EASY");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isFlipped, isLoading, isReviewing, dueCards.length, currentIndex]);

  const currentCard = dueCards[currentIndex];
  const totalDue = reviewedCount + dueCards.length;
  const progress = totalDue > 0 ? (reviewedCount / totalDue) * 100 : 0;

  if (!deckId) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Cram Mode Badge */}
      {isCramMode && (
        <div className="fixed top-20 right-4 z-50 bg-orange-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
          <Flame className="h-4 w-4" />
          <span className="font-semibold text-sm">Chế độ thẻ khó</span>
        </div>
      )}
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/decks/${deckId}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại
            </Button>
            <div className="text-sm font-medium">
              Đã học: {reviewedCount} / {totalDue}
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Đang tải thẻ...</p>
          </div>
        ) : dueCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-green-100 p-6 mb-6">
              <Trophy className="h-16 w-16 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold mb-2">Hoàn thành xuất sắc!</h2>
            <p className="text-muted-foreground mb-8 max-w-md">
              Bạn đã hoàn thành tất cả {reviewedCount} thẻ cần ôn tập hôm nay.
              Hãy quay lại sau để tiếp tục học tập!
            </p>
            <Button size="lg" onClick={() => router.push(`/decks/${deckId}`)}>
              Quay lại bộ thẻ
            </Button>
          </div>
        ) : currentCard ? (
          <div className="space-y-8">
            <Flashcard
              card={currentCard}
              isFlipped={isFlipped}
              onFlip={handleFlip}
            />
            <ReviewControls
              isVisible={isFlipped}
              onReview={handleReview}
              isLoading={isReviewing}
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}
