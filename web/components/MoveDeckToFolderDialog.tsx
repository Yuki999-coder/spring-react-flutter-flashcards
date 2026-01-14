"use client";

import { useState, useEffect } from "react";
import { Folder as FolderIcon, Check } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { Deck } from "@/types/deck";
import { Folder } from "@/types/folder";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface MoveDeckToFolderDialogProps {
  deck: Deck;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMoved: () => void;
}

export function MoveDeckToFolderDialog({
  deck,
  open,
  onOpenChange,
  onMoved,
}: MoveDeckToFolderDialogProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (open) {
      fetchFolders();
      setSelectedFolderId(deck.folderId || null);
    }
  }, [open, deck.folderId]);

  const fetchFolders = async () => {
    setIsFetching(true);
    try {
      const response = await api.get("/folders");
      setFolders(response.data);
    } catch (error: any) {
      const message = error.response?.data?.message || "Không thể tải danh sách folder";
      toast.error(message);
    } finally {
      setIsFetching(false);
    }
  };

  const handleMove = async () => {
    if (selectedFolderId === null) {
      // Remove from folder
      setIsLoading(true);
      try {
        await api.delete(`/folders/decks/${deck.id}`);
        toast.success("Đã chuyển bộ thẻ ra ngoài");
        onOpenChange(false);
        onMoved();
      } catch (error: any) {
        const message = error.response?.data?.message || "Không thể di chuyển bộ thẻ";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Add to folder
      setIsLoading(true);
      try {
        await api.post(`/folders/${selectedFolderId}/decks/${deck.id}`);
        const folderName = folders.find(f => f.id === selectedFolderId)?.name;
        toast.success(`Đã chuyển bộ thẻ vào "${folderName}"`);
        onOpenChange(false);
        onMoved();
      } catch (error: any) {
        const message = error.response?.data?.message || "Không thể di chuyển bộ thẻ";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Chuyển bộ thẻ vào Folder</DialogTitle>
          <DialogDescription>
            Chọn folder để di chuyển <strong>&quot;{deck.title}&quot;</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isFetching ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : folders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có folder nào. Hãy tạo folder trước!
            </div>
          ) : (
            <>
              {/* Option: Uncategorized */}
              <div
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all mb-2",
                  selectedFolderId === null
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => setSelectedFolderId(null)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <FolderIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Không phân loại</p>
                    <p className="text-xs text-muted-foreground">Chuyển ra ngoài Dashboard</p>
                  </div>
                </div>
                {selectedFolderId === null && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </div>

              {/* Folders List */}
              <ScrollArea className="h-[300px] pr-4">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all mb-2",
                      selectedFolderId === folder.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => setSelectedFolderId(folder.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                        <FolderIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{folder.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {folder.deckCount} bộ thẻ
                        </p>
                      </div>
                    </div>
                    {selectedFolderId === folder.id && (
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                ))}
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Hủy
          </Button>
          <Button
            onClick={handleMove}
            disabled={isLoading || isFetching || folders.length === 0}
          >
            {isLoading ? "Đang di chuyển..." : "Di chuyển"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
