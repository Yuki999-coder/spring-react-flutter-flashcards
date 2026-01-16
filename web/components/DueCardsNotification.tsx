"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BookOpen, X, AlertCircle } from "lucide-react";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DueCardsSummary {
  totalDueCards: number;
  decksDue: Array<{
    deckId: number;
    deckTitle: string;
    dueCount: number;
  }>;
}

export function DueCardsNotification() {
  const router = useRouter();
  const [dueCards, setDueCards] = useState<DueCardsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    fetchDueCards();
    
    // Check every 5 minutes for due cards
    const interval = setInterval(fetchDueCards, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDueCards = async () => {
    try {
      const response = await api.get("/cards/due/summary");
      setDueCards(response.data);
      
      // Reset dismissed state when new due cards appear
      if (response.data.totalDueCards > 0) {
        setIsDismissed(false);
      }
    } catch (error) {
      console.error("Failed to fetch due cards:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !dueCards || dueCards.totalDueCards === 0 || isDismissed) {
    return null;
  }

  return (
    <Card className="mb-6 border-amber-200 dark:border-amber-900 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-full">
              <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Thẻ đến hạn ôn tập!
                <Badge variant="default" className="bg-amber-500">
                  {dueCards.totalDueCards} thẻ
                </Badge>
              </CardTitle>
              <CardDescription className="text-amber-700 dark:text-amber-300">
                Bạn có {dueCards.totalDueCards} thẻ cần ôn tập theo lịch SRS
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full"
            onClick={() => setIsDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          {dueCards.decksDue.slice(0, 3).map((deck) => (
            <div
              key={deck.deckId}
              className="flex items-center justify-between p-2 bg-white/60 dark:bg-slate-800/60 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium">{deck.deckTitle}</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{deck.dueCount} thẻ</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/decks/${deck.deckId}/review`)}
                >
                  <BookOpen className="h-3 w-3 mr-1" />
                  Ôn ngay
                </Button>
              </div>
            </div>
          ))}
          {dueCards.decksDue.length > 3 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              ... và {dueCards.decksDue.length - 3} bộ thẻ khác
            </p>
          )}
        </div>
        
        <Button
          className="w-full bg-amber-500 hover:bg-amber-600"
          onClick={() => router.push("/review/all")}
        >
          <BookOpen className="h-4 w-4 mr-2" />
          Ôn tập tất cả ({dueCards.totalDueCards} thẻ)
        </Button>
      </CardContent>
    </Card>
  );
}
