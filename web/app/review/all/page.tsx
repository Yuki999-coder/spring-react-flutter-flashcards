"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/useAuthStore";
import { Flashcard } from "@/components/Flashcard";
import { Button } from "@/components/ui/button";

interface CardProgress {
  id: number;
  cardId: number;
  userId: number;
  learningState: string;
  nextReview: string | null;
  interval: number;
  easeFactor: number;
  repetitions: number;
  card: {
    id: number;
    term: string;
    definition: string;
    example?: string;
    imageUrl?: string;
    audioUrl?: string;
    tags?: string[];
  };
}

export default function ReviewAllPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [dueCards, setDueCards] = useState<CardProgress[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    fetchDueCards();
  }, []);

  const fetchDueCards = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/reviews/due");
      setDueCards(response.data);
      
      if (response.data.length === 0) {
        toast.info("Không có thẻ nào cần ôn tập!");
        setIsCompleted(true);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Không thể tải thẻ cần ôn tập";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (grade: number) => {
    const currentCard = dueCards[currentIndex];
    
    try {
      await api.post(`/cards/${currentCard.card.id}/review`, { grade });
      
      setReviewedCount((prev) => prev + 1);
      
      // Reset flip state for next card
      setIsFlipped(false);
      
      // Move to next card
      if (currentIndex < dueCards.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        // All cards reviewed
        setIsCompleted(true);
        toast.success("🎉 Hoàn thành ôn tập tổng hợp!");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Lỗi khi ghi nhận đánh giá";
      toast.error(message);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Đang tải thẻ cần ôn tập...</p>
        </div>
      </div>
    );
  }

  if (isCompleted || dueCards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Về trang chủ
          </Button>

          <div className="max-w-2xl mx-auto text-center py-20">
            <div className="rounded-full bg-green-100 p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Hoàn thành xuất sắc! 🎉</h1>
            <p className="text-xl text-muted-foreground mb-2">
              Bạn đã ôn tập <span className="font-bold text-primary">{reviewedCount}</span> thẻ
            </p>
            <p className="text-muted-foreground mb-8">
              {dueCards.length === 0
                ? "Không có thẻ nào cần ôn tập. Hãy nghỉ ngơi!"
                : "Tất cả thẻ đến hạn đã được ôn tập xong!"}
            </p>
            <Button onClick={() => router.push("/")} size="lg">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Về Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = dueCards[currentIndex];
  const progress = ((currentIndex + 1) / dueCards.length) * 100;

  // Safety check
  if (!currentCard || !currentCard.card) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Lỗi: Không tìm thấy thông tin thẻ</p>
          <Button onClick={() => router.push("/")} className="mt-4">
            Về trang chủ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Thoát
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              Ôn tập tổng hợp
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {currentIndex + 1} / {dueCards.length} thẻ
            </p>
          </div>
          <div className="w-[100px]"></div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-violet-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            {Math.round(progress)}% hoàn thành
          </p>
        </div>

        {/* Flashcard */}
        <div className="max-w-3xl mx-auto">
          <Flashcard
            card={currentCard.card}
            isFlipped={isFlipped}
            onFlip={handleFlip}
          />
          
          {/* Review Buttons - Show only when flipped */}
          {isFlipped && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                onClick={() => handleReview(1)}
                variant="outline"
                className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
              >
                😰 Không nhớ
              </Button>
              <Button
                onClick={() => handleReview(3)}
                variant="outline"
                className="bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-700"
              >
                🤔 Khó
              </Button>
              <Button
                onClick={() => handleReview(4)}
                variant="outline"
                className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
              >
                😊 Tốt
              </Button>
              <Button
                onClick={() => handleReview(5)}
                variant="outline"
                className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
              >
                🎉 Dễ dàng
              </Button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="max-w-3xl mx-auto mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border">
            <div className="text-2xl font-bold text-primary">{reviewedCount}</div>
            <div className="text-xs text-muted-foreground">Đã ôn tập</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border">
            <div className="text-2xl font-bold text-orange-600">{dueCards.length - currentIndex}</div>
            <div className="text-xs text-muted-foreground">Còn lại</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border">
            <div className="text-2xl font-bold text-green-600">{dueCards.length}</div>
            <div className="text-xs text-muted-foreground">Tổng cộng</div>
          </div>
        </div>
      </div>
    </div>
  );
}
