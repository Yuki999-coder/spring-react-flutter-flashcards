"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Folder, MoreVertical, Trash2, Edit, BookOpen, Clock } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { Folder as FolderType } from "@/types/folder";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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
import { UpdateFolderDialog } from "@/components/UpdateFolderDialog";

interface FolderCardProps {
  folder: FolderType;
  onDeleted: () => void;
  onUpdated: () => void;
}

const formatRelativeTime = (dateTime: string | null): string => {
  if (!dateTime) return "Never";
  
  const now = new Date();
  const then = new Date(dateTime);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  
  if (seconds < 60) {
    return `${seconds}s ago`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(seconds / 86400);
    return `${days}d ago`;
  }
};

export function FolderCard({ folder, onDeleted, onUpdated }: FolderCardProps) {
  const router = useRouter();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/folders/${folder.id}`);
      toast.success("Đã xóa folder (các bộ thẻ được chuyển ra ngoài)");
      onDeleted();
    } catch (error: any) {
      const message = error.response?.data?.message || "Không thể xóa folder";
      toast.error(message);
    } finally {
      setIsDeleting(false);
      setShowDeleteAlert(false);
    }
  };

  const handleCardClick = async (e: React.MouseEvent) => {
    // Don't navigate if clicking on dropdown menu
    if ((e.target as HTMLElement).closest('[role="menu"]')) {
      return;
    }
    
    // Update last viewed timestamp
    try {
      await api.post(`/folders/${folder.id}/view`);
    } catch (error) {
      console.error("Failed to update last viewed:", error);
    }
    
    router.push(`/folders/${folder.id}`);
  };

  return (
    <>
      <Card
        className="group hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-[1.02] border-2 hover:border-primary/50"
        onClick={handleCardClick}
      >
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
              <Folder className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{folder.name}</CardTitle>
              <CardDescription className="text-sm truncate">
                {folder.deckCount} bộ thẻ
              </CardDescription>
              {folder.lastViewedAt && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Clock className="h-3 w-3" />
                  <span>Viewed {formatRelativeTime(folder.lastViewedAt)}</span>
                </div>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/folders/${folder.id}`)}>
                <BookOpen className="h-4 w-4 mr-2" />
                Mở folder
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUpdateDialog(true);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Đổi tên
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteAlert(true);
                }}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        {folder.description && (
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {folder.description}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa folder?</AlertDialogTitle>
            <AlertDialogDescription>
              Folder <strong>{folder.name}</strong> sẽ bị xóa, nhưng các bộ thẻ bên trong
              sẽ được chuyển ra ngoài (Uncategorized). Bạn chắc chắn muốn tiếp tục?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
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

      {/* Update Dialog */}
      <UpdateFolderDialog
        folder={folder}
        open={showUpdateDialog}
        onOpenChange={setShowUpdateDialog}
        onFolderUpdated={onUpdated}
      />
    </>
  );
}
