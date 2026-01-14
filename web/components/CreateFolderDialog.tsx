"use client";

import { useState } from "react";
import { FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CreateFolderDialogProps {
  onFolderCreated: () => void;
}

export function CreateFolderDialog({ onFolderCreated }: CreateFolderDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Vui lòng nhập tên folder");
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/folders", {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      });
      
      toast.success("Tạo folder thành công!");
      setOpen(false);
      setFormData({ name: "", description: "" });
      onFolderCreated();
    } catch (error: any) {
      const message = error.response?.data?.message || "Không thể tạo folder";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <FolderPlus className="h-5 w-5" />
          Tạo Folder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Tạo Folder mới</DialogTitle>
            <DialogDescription>
              Tạo folder để tổ chức các bộ thẻ của bạn
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Tên Folder <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Ví dụ: Tiếng Anh IELTS, Toán Cao cấp..."
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                disabled={isLoading}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                placeholder="Mô tả ngắn gọn về folder này..."
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
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Đang tạo..." : "Tạo Folder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
