"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, LogOut } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/useAuthStore";
import { Deck } from "@/types/deck";
import { DeckCard } from "@/components/DeckCard";
import { CreateDeckDialog } from "@/components/CreateDeckDialog";
import { DeckSkeleton } from "@/components/DeckSkeleton";
import { StatisticsBlock } from "@/components/StatisticsBlock";
import { Button } from "@/components/ui/button";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, logout, user } = useAuthStore();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    fetchDecks();
  }, []);

  const fetchDecks = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/decks");
      setDecks(response.data);
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Không thể tải danh sách bộ thẻ";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Đăng xuất thành công");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Flashcards Learning</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Statistics Block */}
        <StatisticsBlock />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Bộ thẻ của bạn
            </h2>
            <p className="text-muted-foreground mt-1">
              Quản lý và học tập với các bộ thẻ flashcard
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => router.push('/review/all')}
              size="lg"
              className="bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90"
            >
              <BookOpen className="h-5 w-5 mr-2" />
              Ôn tập tổng hợp
            </Button>
            <CreateDeckDialog onDeckCreated={fetchDecks} />
          </div>
        </div>

        {/* Decks Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <DeckSkeleton key={i} />
            ))}
          </div>
        ) : decks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <BookOpen className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">Chưa có bộ thẻ nào</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Bắt đầu hành trình học tập của bạn bằng cách tạo bộ thẻ đầu tiên.
              Thêm từ vựng, khái niệm hoặc bất kỳ nội dung nào bạn muốn ghi nhớ!
            </p>
            <CreateDeckDialog onDeckCreated={fetchDecks} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {decks.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                onDeleted={fetchDecks}
                onUpdated={fetchDecks}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
