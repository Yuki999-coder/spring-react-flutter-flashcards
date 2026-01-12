'use client';

import { useRouter } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Deck } from '@/types/deck';

interface DeckCardProps {
  deck: Deck;
}

export function DeckCard({ deck }: DeckCardProps) {
  const router = useRouter();

  const truncateDescription = (text: string | null, maxLength: number = 100) => {
    if (!text) return 'Chưa có mô tả';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const handleClick = () => {
    router.push(`/decks/${deck.id}`);
  };

  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-300 hover:border-primary/50 cursor-pointer"
      onClick={handleClick}
    >
      <CardHeader>
        <CardTitle className="line-clamp-1">{deck.title}</CardTitle>
        <CardDescription className="line-clamp-2">
          {truncateDescription(deck.description)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          <span>0 thẻ</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
          variant="outline"
        >
          <BookOpen className="mr-2 h-4 w-4" />
          Xem chi tiết
        </Button>
      </CardFooter>
    </Card>
  );
}
