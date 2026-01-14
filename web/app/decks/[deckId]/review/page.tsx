"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/useAuthStore";
import { Card } from "@/types/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Flashcard } from "@/components/Flashcard";
import { ReviewControls } from "@/components/ReviewControls";

interface PageProps {
  params: Promise<{ deckId: string }>;
}

export default function ReviewPage({ params }: PageProps) {
  const router = useRouter();
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
  }, [deckId]);

  const fetchCards = async () => {
    if (!deckId) return;

    setIsLoading(true);
    try {
      const response = await api.get(`/decks/${deckId}/cards`);
      const cards: Card[] = response.data;

      // Debug: Xem dữ liệu thật từ API
      console.log("Dữ liệu gốc từ API:", cards);

      // Filter due cards
      const now = new Date();
      const due = cards.filter((card) => {
        // TRƯỜNG HỢP 1: Thẻ mới tinh (Backend chưa trả về learningState hoặc null)
        // -> Mặc định cho học luôn
        if (!card.learningState) return true;

        // TRƯỜNG HỢP 2: Thẻ có trạng thái rõ ràng là NEW
        if (card.learningState === "NEW") return true;

        // TRƯỜNG HỢP 3: Thẻ đã học và đến hạn ôn tập (nextReview <= Hiện tại)
        if (card.nextReview) {
          const reviewDate = new Date(card.nextReview);
          return reviewDate <= now;
        }

        // Các trường hợp còn lại (thẻ đang chờ, chưa đến hạn) -> Ẩn đi
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

      console.log("Số thẻ cần học sau khi lọc:", sorted.length);

      setAllCards(cards);
      setDueCards(sorted);

      if (sorted.length === 0) {
        toast.info("Không có thẻ nào cần ôn tập!");
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
