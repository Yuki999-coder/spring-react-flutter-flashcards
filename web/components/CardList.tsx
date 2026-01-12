'use client';

import { Card } from '@/types/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BookOpen } from 'lucide-react';

interface CardListProps {
  cards: Card[];
  isLoading: boolean;
}

const getLearningStateBadge = (state: Card['learningState']) => {
  const variants = {
    NEW: { variant: 'secondary' as const, label: 'Mới' },
    LEARNING_MCQ: { variant: 'info' as const, label: 'Đang học (MCQ)' },
    LEARNING_TYPING: { variant: 'info' as const, label: 'Đang học (Gõ)' },
    REVIEWING: { variant: 'success' as const, label: 'Ôn tập' },
    RELEARNING: { variant: 'warning' as const, label: 'Học lại' },
  };

  const config = variants[state] || variants.NEW;
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export function CardList({ cards, isLoading }: CardListProps) {
  if (isLoading) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">No.</TableHead>
              <TableHead>Thuật ngữ</TableHead>
              <TableHead>Định nghĩa</TableHead>
              <TableHead>Ví dụ</TableHead>
              <TableHead className="w-32">Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="h-4 w-8 bg-muted animate-pulse rounded" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                </TableCell>
                <TableCell>
                  <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="border rounded-lg p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Chưa có thẻ nào</h3>
          <p className="text-sm text-muted-foreground">
            Bắt đầu thêm thẻ học tập cho bộ thẻ này
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">No.</TableHead>
            <TableHead>Thuật ngữ</TableHead>
            <TableHead>Định nghĩa</TableHead>
            <TableHead>Ví dụ</TableHead>
            <TableHead className="w-32">Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cards.map((card, index) => (
            <TableRow key={card.id}>
              <TableCell className="font-medium text-muted-foreground">
                {index + 1}
              </TableCell>
              <TableCell className="font-medium">{card.term}</TableCell>
              <TableCell>{card.definition}</TableCell>
              <TableCell className="text-muted-foreground">
                {card.example || '-'}
              </TableCell>
              <TableCell>{getLearningStateBadge(card.learningState)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
