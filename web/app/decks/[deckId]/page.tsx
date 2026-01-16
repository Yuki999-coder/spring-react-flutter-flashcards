"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  Plus,
  Grid3x3,
  ClipboardList,
  Flame,
  Sparkles,
  BarChart3,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/useAuthStore";
import { Deck } from "@/types/deck";
import { Card } from "@/types/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardList } from "@/components/CardList";
import { AddCardDialog } from "@/components/AddCardDialog";
import { ImportExportDialog } from "@/components/ImportExportDialog";
import { AiGenerateDialog } from "@/components/AiGenerateDialog";
import { StudyAnalytics } from "@/components/StudyAnalytics";

interface PageProps {
  params: Promise<{ deckId: string }>;
}

export default function DeckDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [deckId, setDeckId] = useState<string | null>(null);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [difficultCount, setDifficultCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("cards");
  
  // Mastery filter states
  const [masteryStats, setMasteryStats] = useState<{
    newCards: number;
    stillLearning: number;
    almostDone: number;
    mastered: number;
  } | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "new" | "learning" | "almost" | "mastered">("all");

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
      fetchData();
    }
  }, [deckId]);

  const fetchData = async () => {
    if (!deckId) return;

    setIsLoading(true);
    try {
      const [deckResponse, cardsResponse, difficultCountResponse, masteryResponse] = await Promise.all([
        api.get(`/decks/${deckId}`),
        api.get(`/decks/${deckId}/cards`),
        api.get(`/decks/${deckId}/cards/difficult/count`),
        api.get(`/statistics/summary/enhanced?deckId=${deckId}`),
      ]);

      const starredData = cardsResponse.data.map((c: any) => ({ 
        id: c.id, 
        term: c.term.substring(0, 30), 
        isStarred: c.isStarred 
      }));
      console.log("📦 Fetched cards with isStarred:");
      console.table(starredData);
      
      setDeck(deckResponse.data);
      setCards(cardsResponse.data);
      setDifficultCount(difficultCountResponse.data);
      
      // Set mastery stats
      const mastery = masteryResponse.data.masteryLevels;
      setMasteryStats({
        newCards: mastery.newCards || 0,
        stillLearning: mastery.stillLearning || 0,
        almostDone: mastery.almostDone || 0,
        mastered: mastery.mastered || 0,
      });
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error("Không tìm thấy bộ thẻ");
        router.push("/");
      } else {
        const message =
          error.response?.data?.message || "Không thể tải dữ liệu";
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudy = () => {
    if (!deck || cards.length === 0) return;
    router.push(`/decks/${deckId}/review`);
  };

  const handleLearn = () => {
    if (!deck || cards.length === 0) return;
    router.push(`/decks/${deckId}/learn`);
  };

  const handleMatch = () => {
    if (!deck || cards.length === 0) return;
    router.push(`/decks/${deckId}/match`);
  };

  const handleTest = () => {
    if (!deck || cards.length === 0) return;
    router.push(`/decks/${deckId}/test`);
  };

  const handleCramMode = () => {
    if (!deck || difficultCount === 0) return;
    router.push(`/decks/${deckId}/review?mode=difficult`);
  };

  // Helper function to get mastery level of a card
  const getCardMasteryLevel = (card: Card): "new" | "learning" | "almost" | "mastered" => {
    if (!card.learningState || card.learningState === "NEW") {
      return "new";
    }
    
    if (card.learningState === "LEARNING_MCQ" || 
        card.learningState === "LEARNING_TYPING" || 
        card.learningState === "RELEARNING") {
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

  // Filter cards based on selected filter
  const filteredCards = cards.filter((card) => {
    if (selectedFilter === "all") return true;
    return getCardMasteryLevel(card) === selectedFilter;
  });

  if (!deckId) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Header */}
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
              className="mb-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại
            </Button>

            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
              </div>
            ) : deck ? (
              <div>
                <h1 className="text-3xl font-bold">{deck.title}</h1>
                {deck.description && (
                  <p className="text-muted-foreground mt-1">
                    {deck.description}
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          {/* Tabs for Cards and Analytics */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="cards" className="gap-2">
                <FileText className="h-4 w-4" />
                Danh sách thẻ ({cards.length})
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Thống kê
              </TabsTrigger>
            </TabsList>

            {/* Cards Tab */}
            <TabsContent value="cards" className="mt-0">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">
                  Danh sách thẻ ({cards.length})
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Quản lý các thẻ học tập trong bộ thẻ này
                </p>
              </div>
              
              {/* Row 1: Quản lý thẻ */}
              <div className="flex gap-2">
                {deckId && (
                  <>
                    <AddCardDialog
                      deckId={parseInt(deckId)}
                      onCardAdded={fetchData}
                    />
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => setAiDialogOpen(true)}
                          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          Tạo bằng AI
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Dùng AI để tạo flashcards tự động</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <ImportExportDialog
                      deckId={parseInt(deckId)}
                      onImportSuccess={fetchData}
                    />

                    <Button
                      variant="outline"
                      onClick={() => router.push(`/decks/${deckId}/bulk-add`)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Thêm hàng loạt
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Row 2: Học tập */}
            <div className="flex justify-end gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={handleLearn}
                      disabled={cards.length === 0}
                      variant="outline"
                    >
                      <Brain className="mr-2 h-4 w-4" />
                      Học thuộc lòng
                    </Button>
                  </span>
                </TooltipTrigger>
                {cards.length === 0 ? (
                  <TooltipContent>
                    <p>Cần có ít nhất 1 thẻ để bắt đầu học</p>
                  </TooltipContent>
                ) : (
                  <TooltipContent className="max-w-sm">
                    <p className="font-semibold mb-1">Học tất cả thẻ</p>
                    <p className="text-xs">
                      4 chế độ: Trắc nghiệm, Gõ phím, Hỗn hợp, Lật thẻ.
                      Dùng cho <strong>thẻ mới</strong> hoặc ôn tập tất cả thẻ trong deck.
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={handleMatch}
                      disabled={cards.length === 0}
                      variant="outline"
                    >
                      <Grid3x3 className="mr-2 h-4 w-4" />
                      Match Game
                    </Button>
                  </span>
                </TooltipTrigger>
                {cards.length === 0 && (
                  <TooltipContent>
                    <p>Cần có ít nhất 1 thẻ để chơi game</p>
                  </TooltipContent>
                )}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={handleTest}
                      disabled={cards.length === 0}
                      variant="outline"
                    >
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Test
                    </Button>
                  </span>
                </TooltipTrigger>
                {cards.length === 0 && (
                  <TooltipContent>
                    <p>Cần có ít nhất 1 thẻ để làm bài kiểm tra</p>
                  </TooltipContent>
                )}
              </Tooltip>

              {/* Cram Mode Button - Review Difficult Cards */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={handleCramMode}
                      disabled={difficultCount === 0}
                      variant="outline"
                      className="border-orange-500 text-orange-600 hover:bg-orange-50 hover:text-orange-700 disabled:border-gray-300 disabled:text-gray-400"
                    >
                      <Flame className="mr-2 h-4 w-4" />
                      Ôn tập {difficultCount} thẻ khó
                    </Button>
                  </span>
                </TooltipTrigger>
                {difficultCount === 0 ? (
                  <TooltipContent>
                    <p>Không có thẻ khó để ôn tập</p>
                  </TooltipContent>
                ) : (
                  <TooltipContent>
                    <p>Ôn tập những thẻ bạn hay quên hoặc học lại</p>
                  </TooltipContent>
                )}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={handleStudy}
                      disabled={cards.length === 0}
                      variant="default"
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      Ôn tập SRS
                    </Button>
                  </span>
                </TooltipTrigger>
                {cards.length === 0 ? (
                  <TooltipContent>
                    <p>Cần có ít nhất 1 thẻ để bắt đầu học</p>
                  </TooltipContent>
                ) : (
                  <TooltipContent className="max-w-sm">
                    <p className="font-semibold mb-1">Ôn tập theo lịch SRS</p>
                    <p className="text-xs">
                      Chỉ hiển thị các thẻ <strong>đến hạn ôn tập</strong> theo thuật toán Spaced Repetition.
                      Nếu không có thẻ nào, hãy dùng <strong>"Học thuộc lòng"</strong> để bắt đầu học thẻ mới!
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>

          {/* Mastery Level Filter Buttons */}
          {masteryStats && (
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant={selectedFilter === "all" ? "default" : "outline"}
                onClick={() => setSelectedFilter("all")}
                size="sm"
              >
                📚 All Cards ({cards.length})
              </Button>
              {masteryStats.newCards > 0 && (
                <Button
                  variant={selectedFilter === "new" ? "default" : "outline"}
                  onClick={() => setSelectedFilter("new")}
                  size="sm"
                >
                  ⭐ New Cards ({masteryStats.newCards})
                </Button>
              )}
              {masteryStats.stillLearning > 0 && (
                <Button
                  variant={selectedFilter === "learning" ? "default" : "outline"}
                  onClick={() => setSelectedFilter("learning")}
                  size="sm"
                >
                  🧠 Still Learning ({masteryStats.stillLearning})
                </Button>
              )}
              {masteryStats.almostDone > 0 && (
                <Button
                  variant={selectedFilter === "almost" ? "default" : "outline"}
                  onClick={() => setSelectedFilter("almost")}
                  size="sm"
                >
                  🎯 Almost Done ({masteryStats.almostDone})
                </Button>
              )}
              {masteryStats.mastered > 0 && (
                <Button
                  variant={selectedFilter === "mastered" ? "default" : "outline"}
                  onClick={() => setSelectedFilter("mastered")}
                  size="sm"
                >
                  ✅ Mastered ({masteryStats.mastered})
                </Button>
              )}
            </div>
          )}

          <CardList
            cards={filteredCards}
            isLoading={isLoading}
            onCardDeleted={fetchData}
            onCardUpdated={fetchData}
          />
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="mt-0">
              {deckId && <StudyAnalytics deckId={parseInt(deckId)} />}
            </TabsContent>
          </Tabs>
        </main>
        
        {/* AI Generate Dialog */}
        {deckId && (
          <AiGenerateDialog
            open={aiDialogOpen}
            onOpenChange={setAiDialogOpen}
            deckId={parseInt(deckId)}
            onCardsCreated={fetchData}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
