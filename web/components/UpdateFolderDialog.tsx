"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/axios";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface UpdateFolderDialogProps {
  folder: Folder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFolderUpdated: () => void;
}

export function UpdateFolderDialog({
  folder,
  open,
  onOpenChange,
  onFolderUpdated,
}: UpdateFolderDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: folder.name,
    description: folder.description || "",
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: folder.name,
        description: folder.description || "",
      });
    }
  }, [open, folder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Vui lòng nhập tên folder");
      return;
    }

    setIsLoading(true);
    try {
      await api.put(`/folders/${folder.id}`, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      });

      toast.success("Cập nhật folder thành công!");
      onOpenChange(false);
      onFolderUpdated();
    } catch (error: any) {
      const message = error.response?.data?.message || "Không thể cập nhật folder";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Cập nhật Folder</DialogTitle>
            <DialogDescription>
              Thay đổi tên hoặc mô tả của folder
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">
                Tên Folder <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-name"
                placeholder="Tên folder..."
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                disabled={isLoading}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Mô tả</Label>
              <Textarea
                id="edit-description"
                placeholder="Mô tả folder..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                disabled={isLoading}
                rows={3}
              />
            </div>
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
