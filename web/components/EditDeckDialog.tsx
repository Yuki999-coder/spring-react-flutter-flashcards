"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { Deck } from "@/types/deck";
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

const editDeckSchema = z.object({
  title: z
    .string()
    .min(1, "Tiêu đề không được để trống")
    .max(255, "Tiêu đề quá dài"),
  description: z.string().optional(),
});

type EditDeckFormData = z.infer<typeof editDeckSchema>;

interface EditDeckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deck: Deck;
  onUpdated: () => void;
}

export function EditDeckDialog({
  open,
  onOpenChange,
  deck,
  onUpdated,
}: EditDeckDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditDeckFormData>({
    resolver: zodResolver(editDeckSchema),
    defaultValues: {
      title: deck.title,
      description: deck.description || "",
    },
  });

  const onSubmit = async (data: EditDeckFormData) => {
    setIsLoading(true);
    try {
      await api.put(`/decks/${deck.id}`, {
        title: data.title,
        description: data.description || undefined,
      });

      toast.success("Cập nhật bộ thẻ thành công!");
      onOpenChange(false);
      onUpdated();
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        "Không thể cập nhật bộ thẻ. Vui lòng thử lại.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa bộ thẻ</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin cho bộ thẻ của bạn.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">
                Tiêu đề <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-title"
                {...register("title")}
                className={errors.title ? "border-red-500" : ""}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Mô tả</Label>
              <Textarea
                id="edit-description"
                rows={4}
                {...register("description")}
                className={errors.description ? "border-red-500" : ""}
              />
              {errors.description && (
                <p className="text-sm text-red-500">
                  {errors.description.message}
                </p>
              )}
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
              {isLoading ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
