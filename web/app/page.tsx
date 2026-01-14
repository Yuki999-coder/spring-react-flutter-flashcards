"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, LogOut, FolderPlus, Folder as FolderIcon } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/useAuthStore";
import { Deck } from "@/types/deck";
import { Folder } from "@/types/folder";
import { DeckCard } from "@/components/DeckCard";
import { FolderCard } from "@/components/FolderCard";
import { CreateDeckDialog } from "@/components/CreateDeckDialog";
import { CreateFolderDialog } from "@/components/CreateFolderDialog";
import { DeckSkeleton } from "@/components/DeckSkeleton";
import { StatisticsBlock } from "@/components/StatisticsBlock";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, logout, user } = useAuthStore();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [uncategorizedDecks, setUncategorizedDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("folders");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [foldersRes, decksRes] = await Promise.all([
        api.get("/folders"),
        api.get("/folders/uncategorized"),
      ]);
      setFolders(foldersRes.data);
      setUncategorizedDecks(decksRes.data);
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Không thể tải dữ liệu";
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
              Thư viện của bạn
            </h2>
            <p className="text-muted-foreground mt-1">
              Quản lý folders và bộ thẻ flashcard
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => router.push('/review/all')}
              size="lg"
              variant="outline"
            >
              <BookOpen className="h-5 w-5 mr-2" />
              Ôn tập tổng hợp
            </Button>
          </div>
        </div>

        {/* Tabs: Folders & Uncategorized Decks */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="folders" className="gap-2">
              <FolderIcon className="h-4 w-4" />
              Folders ({folders.length})
            </TabsTrigger>
            <TabsTrigger value="uncategorized" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Bộ thẻ lẻ ({uncategorizedDecks.length})
            </TabsTrigger>
          </TabsList>

          {/* Folders Tab */}
          <TabsContent value="folders" className="mt-0">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Thư mục</h3>
              <CreateFolderDialog onFolderCreated={fetchData} />
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <DeckSkeleton key={i} />
                ))}
              </div>
            ) : folders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-lg">
                <div className="rounded-full bg-muted p-6 mb-4">
                  <FolderIcon className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">Chưa có folder nào</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Tạo folder để tổ chức các bộ thẻ của bạn một cách khoa học hơn
                </p>
                <CreateFolderDialog onFolderCreated={fetchData} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {folders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    onDeleted={fetchData}
                    onUpdated={fetchData}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Uncategorized Decks Tab */}
          <TabsContent value="uncategorized" className="mt-0">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Bộ thẻ chưa phân loại</h3>
              <CreateDeckDialog onDeckCreated={fetchData} />
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <DeckSkeleton key={i} />
                ))}
              </div>
            ) : uncategorizedDecks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-lg">
                <div className="rounded-full bg-muted p-6 mb-4">
                  <BookOpen className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">Không có bộ thẻ nào</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Tất cả bộ thẻ của bạn đã được sắp xếp vào folder. Hoặc tạo bộ thẻ mới!
                </p>
                <CreateDeckDialog onDeckCreated={fetchData} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {uncategorizedDecks.map((deck) => (
                  <DeckCard
                    key={deck.id}
                    deck={deck}
                    onDeleted={fetchData}
                    onUpdated={fetchData}
                    onMoved={fetchData}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
