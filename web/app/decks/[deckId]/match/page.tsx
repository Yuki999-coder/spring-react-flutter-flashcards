"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trophy, RotateCcw, Timer } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/useAuthStore";
import { Card } from "@/types/card";
import { Button } from "@/components/ui/button";
import { Card as UICard, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MatchPiece {
  id: string;
  cardId: number;
  type: "term" | "definition";
  content: string;
  imageUrl?: string;
}

interface PageProps {
  params: Promise<{ deckId: string }>;
}

export default function MatchGamePage({ params }: PageProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [deckId, setDeckId] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Game state
  const [pieces, setPieces] = useState<MatchPiece[]>([]);
  const [selectedPieces, setSelectedPieces] = useState<string[]>([]);
  const [matchedPieceIds, setMatchedPieceIds] = useState<Set<string>>(
    new Set()
  );
  const [wrongPieceIds, setWrongPieceIds] = useState<Set<string>>(new Set());
  const [isChecking, setIsChecking] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Timer
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

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

  // Timer effect
  useEffect(() => {
    if (!timerRunning) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning]);

  const fetchCards = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/decks/${deckId}/cards`);
      const fetchedCards = response.data;

      if (fetchedCards.length === 0) {
        toast.error("Deck này chưa có thẻ nào");
        router.push(`/decks/${deckId}`);
        return;
      }

      setCards(fetchedCards);
      initializeGame(fetchedCards);
    } catch (error: any) {
      const message = error.response?.data?.message || "Không thể tải thẻ";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeGame = (allCards: Card[]) => {
    // Chọn ngẫu nhiên 6 thẻ (hoặc ít hơn nếu deck nhỏ)
    const shuffled = [...allCards].sort(() => Math.random() - 0.5);
    const selectedCards = shuffled.slice(0, Math.min(6, allCards.length));

    // Tạo các mảnh ghép
    const gamePieces: MatchPiece[] = [];

    selectedCards.forEach((card) => {
      // Mảnh Term
      gamePieces.push({
        id: `term-${card.id}`,
        cardId: card.id,
        type: "term",
        content: card.term,
      });

      // Mảnh Definition
      gamePieces.push({
        id: `def-${card.id}`,
        cardId: card.id,
        type: "definition",
        content: card.definition,
        imageUrl: card.imageUrl,
      });
    });

    // Shuffle các mảnh
    const shuffledPieces = gamePieces.sort(() => Math.random() - 0.5);
    setPieces(shuffledPieces);

    // Reset game state
    setSelectedPieces([]);
    setMatchedPieceIds(new Set());
    setWrongPieceIds(new Set());
    setIsComplete(false);
    setTimer(0);
    setTimerRunning(true);
  };

  const handlePieceClick = (pieceId: string) => {
    // Ignore if checking, already matched, or already selected
    if (
      isChecking ||
      matchedPieceIds.has(pieceId) ||
      selectedPieces.includes(pieceId)
    ) {
      return;
    }

    const newSelected = [...selectedPieces, pieceId];
    setSelectedPieces(newSelected);

    // Check if 2 pieces are selected
    if (newSelected.length === 2) {
      checkMatch(newSelected[0], newSelected[1]);
    }
  };

  const checkMatch = (pieceId1: string, pieceId2: string) => {
    setIsChecking(true);

    const piece1 = pieces.find((p) => p.id === pieceId1);
    const piece2 = pieces.find((p) => p.id === pieceId2);

    if (!piece1 || !piece2) return;

    // Check if same cardId (correct match)
    if (piece1.cardId === piece2.cardId) {
      // Correct match!
      setTimeout(() => {
        setMatchedPieceIds((prev) => new Set([...prev, pieceId1, pieceId2]));
        setSelectedPieces([]);
        setIsChecking(false);

        // Check if game complete
        const newMatchedCount = matchedPieceIds.size + 2;
        if (newMatchedCount === pieces.length) {
          handleGameComplete();
        }
      }, 500);
    } else {
      // Wrong match!
      setWrongPieceIds(new Set([pieceId1, pieceId2]));

      setTimeout(() => {
        setWrongPieceIds(new Set());
        setSelectedPieces([]);
        setIsChecking(false);
      }, 800);
    }
  };

  const handleGameComplete = () => {
    setTimerRunning(false);
    setIsComplete(true);

    // Confetti animation
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

    toast.success("🎉 Chúc mừng! Bạn đã hoàn thành!");
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleRestart = () => {
    initializeGame(cards);
  };

  if (!deckId || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <header className="border-b bg-white/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-96 w-full max-w-4xl mx-auto" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/decks/${deckId}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại
            </Button>

            <div className="flex items-center gap-6">
              {/* Timer */}
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Timer className="h-5 w-5 text-primary" />
                <span className="font-mono">{formatTime(timer)}</span>
              </div>

              {/* Restart Button */}
              <Button variant="outline" size="sm" onClick={handleRestart}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Chơi lại
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {isComplete ? (
          // Win Screen
          <div className="max-w-2xl mx-auto text-center">
            <UICard className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200">
              <CardContent className="pt-12 pb-12">
                <div className="flex justify-center mb-6">
                  <Trophy className="h-24 w-24 text-yellow-500" />
                </div>
                <h1 className="text-4xl font-bold mb-4">Chúc mừng! 🎉</h1>
                <p className="text-xl text-muted-foreground mb-6">
                  Bạn đã hoàn thành trò chơi!
                </p>
                <div className="bg-white/50 rounded-lg p-6 mb-8">
                  <p className="text-sm text-muted-foreground mb-2">
                    Thời gian hoàn thành
                  </p>
                  <p className="text-5xl font-bold text-primary font-mono">
                    {formatTime(timer)}
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/decks/${deckId}`)}
                  >
                    Về trang chủ
                  </Button>
                  <Button onClick={handleRestart}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Chơi lại
                  </Button>
                </div>
              </CardContent>
            </UICard>
          </div>
        ) : (
          // Game Grid
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {pieces.map((piece) => {
                const isSelected = selectedPieces.includes(piece.id);
                const isMatched = matchedPieceIds.has(piece.id);
                const isWrong = wrongPieceIds.has(piece.id);

                if (isMatched) return null; // Hide matched pieces

                return (
                  <MatchCard
                    key={piece.id}
                    piece={piece}
                    isSelected={isSelected}
                    isWrong={isWrong}
                    onClick={() => handlePieceClick(piece.id)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Match Card Component
interface MatchCardProps {
  piece: MatchPiece;
  isSelected: boolean;
  isWrong: boolean;
  onClick: () => void;
}

function MatchCard({ piece, isSelected, isWrong, onClick }: MatchCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        p-4 rounded-xl border-2 transition-all duration-200
        min-h-[120px] flex flex-col items-center justify-center
        ${
          isSelected
            ? "bg-blue-100 border-blue-500 scale-95"
            : isWrong
            ? "bg-red-100 border-red-500 animate-shake"
            : "bg-white border-gray-200 hover:border-primary hover:shadow-lg hover:scale-105"
        }
      `}
    >
      {/* Image if available */}
      {piece.imageUrl && (
        <div className="relative w-16 h-16 mb-2 rounded overflow-hidden">
          <img
            src={piece.imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div
        className="text-sm md:text-base font-medium text-center prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: piece.content }}
      />

      {/* Type indicator */}
      <div className="mt-2 text-xs text-muted-foreground">
        {piece.type === "term" ? "📝 Thuật ngữ" : "📖 Định nghĩa"}
      </div>
    </button>
  );
}
