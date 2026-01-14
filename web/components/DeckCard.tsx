"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, MoreVertical, Pencil, Trash, FolderInput } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { EditDeckDialog } from "@/components/EditDeckDialog";
import { MoveDeckToFolderDialog } from "@/components/MoveDeckToFolderDialog";
import { Deck } from "@/types/deck";

interface DeckCardProps {
  deck: Deck;
  onDeleted?: () => void;
  onUpdated?: () => void;
  onMoved?: () => void;
}

export function DeckCard({ deck, onDeleted, onUpdated, onMoved }: DeckCardProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const truncateDescription = (
    text: string | null,
    maxLength: number = 100
  ) => {
    if (!text) return "Chưa có mô tả";
    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Không navigate khi click vào dropdown menu
    const target = e.target as HTMLElement;
    if (target.closest("[data-dropdown-trigger]")) {
      return;
    }
    router.push(`/decks/${deck.id}`);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/decks/${deck.id}`);
      toast.success("Đã xóa bộ thẻ thành công!");
      setIsDeleteOpen(false);
      onDeleted?.();
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        "Không thể xóa bộ thẻ. Vui lòng thử lại.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card
        className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 cursor-pointer bg-white/80 backdrop-blur-sm border-2 rounded-2xl overflow-hidden"
        onClick={handleCardClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="line-clamp-1 text-xl font-bold bg-gradient-to-r from-primary to-violet-600 bg-clip-text text-transparent">
                {deck.title}
              </CardTitle>
              <CardDescription className="line-clamp-2 mt-1.5 text-sm">
                {truncateDescription(deck.description)}
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 -mt-1 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10"
                  data-dropdown-trigger
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditOpen(true);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Chỉnh sửa
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMoveOpen(true);
                  }}
                >
                  <FolderInput className="mr-2 h-4 w-4" />
                  Chuyển vào Folder...
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDeleteOpen(true);
                  }}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Xóa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-primary/5 rounded-lg px-3 py-2 border border-primary/10">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="font-medium">{deck.cardCount ?? 0} thẻ</span>
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <Button
            className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-sm group-hover:shadow-md"
            variant="outline"
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Xem chi tiết
          </Button>
        </CardFooter>
      </Card>

      <EditDeckDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        deck={deck}
        onUpdated={() => {
          onUpdated?.();
        }}
      />

      <MoveDeckToFolderDialog
        open={isMoveOpen}
        onOpenChange={setIsMoveOpen}
        deck={deck}
        onMoved={() => {
          onMoved?.();
        }}
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa bộ thẻ</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa bộ thẻ{" "}
              <strong>&quot;{deck.title}&quot;</strong>?
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
