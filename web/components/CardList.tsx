"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { Card } from "@/types/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { BookOpen, MoreHorizontal, Pencil, Trash, Trash2, Star, GripVertical, ArrowUpDown } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface CardListProps {
  cards: Card[];
  isLoading: boolean;
  onCardDeleted?: () => void;
  onCardUpdated?: () => void;
}

const getCardMasteryLevel = (card: Card): "new" | "learning" | "almost" | "mastered" => {
  if (!card.learningState || card.learningState === "NEW") return "new";
  if (
    card.learningState === "LEARNING_MCQ" ||
    card.learningState === "LEARNING_TYPING" ||
    card.learningState === "RELEARNING"
  ) {
    return "learning";
  }
  if (card.learningState === "REVIEWING" && card.interval !== undefined) {
    const interval = card.interval;
    if (interval >= 21) {
      return "mastered";
    } else if (interval >= 3) {
      return "almost";
    } else {
      return "learning";
    }
  }
  return "new";
};

const getMasteryBadge = (card: Card) => {
  const mastery = getCardMasteryLevel(card);
  const variants = {
    new: { variant: "secondary" as const, label: "Thẻ mới" },
    learning: { variant: "default" as const, label: "Đang học" },
    almost: { variant: "outline" as const, label: "Sắp thuộc" },
    mastered: { variant: "success" as const, label: "Đã thuộc" },
  };

  const config = variants[mastery];
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

// Sortable row component for drag and drop
interface SortableRowProps {
  card: Card;
  index: number;
  isSelected: boolean;
  isReordering: boolean;
  onToggleSelect: (cardId: number) => void;
  onToggleStar: (card: Card, e: React.MouseEvent) => void;
  onEdit: (card: Card) => void;
  onDelete: (card: Card) => void;
}

function SortableRow({
  card,
  index,
  isSelected,
  isReordering,
  onToggleSelect,
  onToggleStar,
  onEdit,
  onDelete,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, disabled: !isReordering });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`${isSelected ? "bg-blue-50" : ""} ${isDragging ? "z-50" : ""}`}
    >
      <TableCell>
        {!isReordering && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(card.id)}
          />
        )}
        {isReordering && (
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </TableCell>
      <TableCell className="font-medium text-muted-foreground">
        {index + 1}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => onToggleStar(card, e)}
          disabled={isReordering}
        >
          <Star
            className={`h-4 w-4 ${
              card.isStarred ? "fill-yellow-400 text-yellow-400" : "text-gray-400"
            }`}
          />
        </Button>
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
      <TableCell>{getMasteryBadge(card)}</TableCell>
      <TableCell>
        {!isReordering && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(card)}>
                <Pencil className="mr-2 h-4 w-4" />
                Chỉnh sửa
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => onDelete(card)}
              >
                <Trash className="mr-2 h-4 w-4" />
                Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  );
}

export function CardList({
  cards,
  isLoading,
  onCardDeleted,
  onCardUpdated,
}: CardListProps) {
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [deletingCard, setDeletingCard] = useState<Card | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set());
  const [showBulkDeleteAlert, setShowBulkDeleteAlert] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [reorderedCards, setReorderedCards] = useState<Card[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setReorderedCards((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleToggleReorder = () => {
    if (isReordering) {
      // Cancel reordering - reset to original order
      setReorderedCards([]);
      setIsReordering(false);
    } else {
      // Start reordering - copy current cards
      setReorderedCards([...cards]);
      setIsReordering(true);
    }
  };

  const handleSaveOrder = async () => {
    if (!reorderedCards.length || !cards[0]?.deckId) return;

    setIsSavingOrder(true);
    try {
      const cardIds = reorderedCards.map((card) => card.id);
      await api.put(`/decks/${cards[0].deckId}/cards/reorder`, {
        cardIds,
      });
      toast.success("Đã lưu thứ tự thẻ thành công!");
      setIsReordering(false);
      setReorderedCards([]);
      onCardUpdated?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Không thể lưu thứ tự thẻ");
    } finally {
      setIsSavingOrder(false);
    }
  };

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

  const handleBulkDelete = async () => {
    if (selectedCards.size === 0) return;

    setIsDeleting(true);
    try {
      await api.delete('/cards/bulk-delete', {
        data: Array.from(selectedCards)
      });
      toast.success(`Đã xóa ${selectedCards.size} thẻ thành công!`);
      setSelectedCards(new Set());
      setShowBulkDeleteAlert(false);
      onCardDeleted?.();
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Không thể xóa các thẻ. Vui lòng thử lại.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleCardSelection = (cardId: number) => {
    const newSelection = new Set(selectedCards);
    if (newSelection.has(cardId)) {
      newSelection.delete(cardId);
    } else {
      newSelection.add(cardId);
    }
    setSelectedCards(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedCards.size === cards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(cards.map(card => card.id)));
    }
  };

  const handleToggleStar = async (card: Card, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStarredState = !card.isStarred;
    
    try {
      const response = await api.put(`/cards/${card.id}`, {
        term: card.term,
        definition: card.definition,
        example: card.example || "",
        isStarred: newStarredState
      });
      
      console.log("⭐ Star toggle response - isStarred:", response.data.isStarred, "Full data:", response.data);
      toast.success(newStarredState ? "Đã đánh dấu sao ⭐" : "Đã bỏ dấu sao");
      
      // Trigger re-fetch to get latest data
      await onCardUpdated?.();
    } catch (error: any) {
      console.error("Toggle star error:", error);
      toast.error(error.response?.data?.message || "Không thể cập nhật thẻ");
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

  const displayCards = isReordering ? reorderedCards : cards;

  return (
    <>
      {/* Reorder Mode Bar */}
      {isReordering && (
        <div className="mb-4 flex items-center justify-between bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-amber-600" />
            <span className="font-medium text-amber-900 dark:text-amber-100">
              Kéo thả để sắp xếp lại thẻ
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleReorder}
              disabled={isSavingOrder}
            >
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleSaveOrder}
              disabled={isSavingOrder}
            >
              {isSavingOrder ? "Đang lưu..." : "Lưu thứ tự"}
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {!isReordering && selectedCards.size > 0 && (
        <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedCards.size === cards.length}
              onCheckedChange={toggleSelectAll}
            />
            <span className="font-medium text-blue-900">
              Đã chọn {selectedCards.size} thẻ
            </span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowBulkDeleteAlert(true)}
            disabled={isDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Xóa {selectedCards.size} thẻ đã chọn
          </Button>
        </div>
      )}

      {/* Reorder Toggle Button */}
      {!isReordering && selectedCards.size === 0 && cards.length > 1 && (
        <div className="mb-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleReorder}
          >
            <ArrowUpDown className="mr-2 h-4 w-4" />
            Thay đổi vị trí thẻ
          </Button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  {!isReordering ? (
                    <Checkbox
                      checked={selectedCards.size === cards.length && cards.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  ) : (
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  )}
                </TableHead>
                <TableHead className="w-16">No.</TableHead>
                <TableHead className="w-12">⭐</TableHead>
                <TableHead>Thuật ngữ</TableHead>
                <TableHead>Định nghĩa</TableHead>
                <TableHead>Ví dụ</TableHead>
                <TableHead className="w-32">Trạng thái</TableHead>
                <TableHead className="w-20">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <SortableContext
              items={displayCards.map((card) => card.id)}
              strategy={verticalListSortingStrategy}
            >
              <TableBody>
                {displayCards.map((card, index) => (
                  <SortableRow
                    key={card.id}
                    card={card}
                    index={index}
                    isSelected={selectedCards.has(card.id)}
                    isReordering={isReordering}
                    onToggleSelect={toggleCardSelection}
                    onToggleStar={handleToggleStar}
                    onEdit={setEditingCard}
                    onDelete={setDeletingCard}
                  />
                ))}
              </TableBody>
            </SortableContext>
          </Table>
        </div>
      </DndContext>

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

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteAlert} onOpenChange={setShowBulkDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa nhiều thẻ</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa <strong>{selectedCards.size} thẻ</strong> đã chọn?
              <br />
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Đang xóa..." : `Xóa ${selectedCards.size} thẻ`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
