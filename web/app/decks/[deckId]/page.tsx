'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/useAuthStore';
import { Deck } from '@/types/deck';
import { Card } from '@/types/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CardList } from '@/components/CardList';
import { AddCardDialog } from '@/components/AddCardDialog';

interface PageProps {
  params: Promise<{ deckId: string }>;
}

export default function DeckDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [deckId, setDeckId] = useState<string | null>(null);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initPage = async () => {
      if (!isAuthenticated()) {
        router.push('/login');
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
      const [deckResponse, cardsResponse] = await Promise.all([
        api.get(`/decks/${deckId}`),
        api.get(`/decks/${deckId}/cards`),
      ]);

      setDeck(deckResponse.data);
      setCards(cardsResponse.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error('Không tìm thấy bộ thẻ');
        router.push('/');
      } else {
        const message =
          error.response?.data?.message || 'Không thể tải dữ liệu';
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudy = () => {
    if (!deck || cards.length === 0) return;
    // TODO: Navigate to study page
    toast.info('Chức năng học thẻ đang phát triển');
  };

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
              onClick={() => router.push('/')}
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">
                Danh sách thẻ ({cards.length})
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Quản lý các thẻ học tập trong bộ thẻ này
              </p>
            </div>
            <div className="flex gap-2">
              {deckId && <AddCardDialog deckId={parseInt(deckId)} onCardAdded={fetchData} />}
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={handleStudy}
                      disabled={cards.length === 0}
                      variant="default"
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      Học ngay
                    </Button>
                  </span>
                </TooltipTrigger>
                {cards.length === 0 && (
                  <TooltipContent>
                    <p>Cần có ít nhất 1 thẻ để bắt đầu học</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>

          <CardList cards={cards} isLoading={isLoading} />
        </main>
      </div>
    </TooltipProvider>
  );
}
