"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { Card } from "@/types/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EditCardDialog } from "@/components/EditCardDialog";
import { BookOpen, MoreHorizontal, Pencil, Trash } from "lucide-react";

interface CardListProps {
  cards: Card[];
  isLoading: boolean;
  onCardDeleted?: () => void;
  onCardUpdated?: () => void;
}

const getLearningStateBadge = (state: Card["learningState"]) => {
  const variants = {
    NEW: { variant: "secondary" as const, label: "Mới" },
    LEARNING_MCQ: { variant: "info" as const, label: "Đang học (MCQ)" },
    LEARNING_TYPING: { variant: "info" as const, label: "Đang học (Gõ)" },
    REVIEWING: { variant: "success" as const, label: "Ôn tập" },
    RELEARNING: { variant: "warning" as const, label: "Học lại" },
  };

  const config = variants[state] || variants.NEW;
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export function CardList({
  cards,
  isLoading,
  onCardDeleted,
  onCardUpdated,
}: CardListProps) {
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [deletingCard, setDeletingCard] = useState<Card | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deletingCard) return;

    setIsDeleting(true);
    try {
      await api.delete(`/cards/${deletingCard.id}`);
      toast.success("Đã xóa thẻ thành công!");
      setDeletingCard(null);
      onCardDeleted?.();
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Không thể xóa thẻ. Vui lòng thử lại.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };
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
              <TableHead className="w-20">Thao tác</TableHead>
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
                <TableCell>
                  <div className="h-8 w-8 bg-muted animate-pulse rounded" />
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
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">No.</TableHead>
              <TableHead>Thuật ngữ</TableHead>
              <TableHead>Định nghĩa</TableHead>
              <TableHead>Ví dụ</TableHead>
              <TableHead className="w-32">Trạng thái</TableHead>
              <TableHead className="w-20">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cards.map((card, index) => (
              <TableRow key={card.id}>
                <TableCell className="font-medium text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell className="font-medium">
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: card.term }}
                  />
                </TableCell>
                <TableCell>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: card.definition }}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {card.example ? (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: card.example }}
                    />
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {getLearningStateBadge(card.learningState)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingCard(card)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Chỉnh sửa
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => setDeletingCard(card)}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingCard && (
        <EditCardDialog
          open={!!editingCard}
          onOpenChange={(open) => !open && setEditingCard(null)}
          card={editingCard}
          onUpdated={() => {
            setEditingCard(null);
            onCardUpdated?.();
          }}
        />
      )}

      <AlertDialog
        open={!!deletingCard}
        onOpenChange={(open) => !open && setDeletingCard(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa thẻ</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa thẻ{" "}
              <strong>&quot;{deletingCard?.term}&quot;</strong>?
              <br />
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
