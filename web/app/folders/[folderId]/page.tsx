"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Folder as FolderIcon, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { Folder } from "@/types/folder";
import { DeckCard } from "@/components/DeckCard";
import { DeckSkeleton } from "@/components/DeckSkeleton";
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

export default function FolderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const folderId = params.folderId as string;
  
  const [folder, setFolder] = useState<Folder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchFolder();
  }, [folderId]);

  const fetchFolder = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/folders/${folderId}?includeDecks=true`);
      setFolder(response.data);
    } catch (error: any) {
      const message = error.response?.data?.message || "Không thể tải folder";
      toast.error(message);
      router.push("/");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/folders/${folderId}`);
      toast.success("Đã xóa folder");
      router.push("/");
    } catch (error: any) {
      const message = error.response?.data?.message || "Không thể xóa folder";
      toast.error(message);
    } finally {
      setIsDeleting(false);
      setShowDeleteAlert(false);
    }
  };

  const handleReviewAll = () => {
    // TODO: Implement review all decks in folder
    toast.info("Tính năng đang phát triển");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <DeckSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!folder) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại Dashboard
          </Button>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-4 rounded-lg bg-amber-100 text-amber-700">
                <FolderIcon className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">{folder.name}</h1>
                {folder.description && (
                  <p className="text-muted-foreground">{folder.description}</p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  {folder.deckCount} bộ thẻ
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowUpdateDialog(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Sửa
              </Button>
              <Button variant="outline" onClick={() => setShowDeleteAlert(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa
              </Button>
              <Button onClick={handleReviewAll} className="gap-2">
                <BookOpen className="h-4 w-4" />
                Ôn tập Folder
              </Button>
            </div>
          </div>
        </div>

        {/* Decks Grid */}
        {folder.decks && folder.decks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {folder.decks.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                onDeleted={fetchFolder}
                onUpdated={fetchFolder}
                onMoved={fetchFolder}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-lg">
            <div className="rounded-full bg-muted p-6 mb-4">
              <BookOpen className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">Folder trống</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Folder này chưa có bộ thẻ nào. Hãy chuyển các bộ thẻ vào đây từ Dashboard!
            </p>
          </div>
        )}
      </div>

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
        onFolderUpdated={fetchFolder}
      />
    </div>
  );
}
