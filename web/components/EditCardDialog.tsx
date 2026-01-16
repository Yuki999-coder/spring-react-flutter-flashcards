"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { Image as ImageIcon, X, Loader2 } from "lucide-react";
import { api } from "@/lib/axios";
import { uploadImageToCloudinary, validateImageFile } from "@/lib/cloudinary";
import { Card } from "@/types/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

interface EditCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: Card;
  onUpdated: () => void;
}

export function EditCardDialog({
  open,
  onOpenChange,
  card,
  onUpdated,
}: EditCardDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>(card.imageUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rich text editor content states
  const [term, setTerm] = useState<string>(card.term);
  const [definition, setDefinition] = useState<string>(card.definition);
  const [example, setExample] = useState<string>(card.example || "");

  // Validation errors
  const [errors, setErrors] = useState<{
    term?: string;
    definition?: string;
  }>({});

  // Reset form when dialog opens or card changes
  useEffect(() => {
    if (open) {
      setTerm(card.term);
      setDefinition(card.definition);
      setExample(card.example || "");
      setImageUrl(card.imageUrl || "");
      setErrors({});
    }
  }, [open, card]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadImageToCloudinary(file);
      setImageUrl(url);
      toast.success("Upload ảnh thành công!");
    } catch (error: any) {
      toast.error(error.message || "Upload ảnh thất bại");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = () => {
    setImageUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: { term?: string; definition?: string } = {};

    // Strip HTML tags to check if there's actual content
    const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();

    if (!stripHtml(term)) {
      newErrors.term = "Thuật ngữ không được để trống";
    }

    if (!stripHtml(definition)) {
      newErrors.definition = "Định nghĩa không được để trống";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await api.put(`/cards/${card.id}`, {
        term,
        definition,
        example: example || undefined,
        imageUrl: imageUrl || undefined,
      });

      toast.success("Cập nhật thẻ thành công!");
      onOpenChange(false);
      onUpdated();
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        "Không thể cập nhật thẻ. Vui lòng thử lại.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa thẻ</DialogTitle>
          <DialogDescription>
            Cập nhật nội dung cho thẻ học tập của bạn.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-term">
                Thuật ngữ (Mặt trước) <span className="text-red-500">*</span>
              </Label>
              <RichTextEditor
                value={term}
                onChange={setTerm}
                placeholder="Nhập thuật ngữ..."
              />
              {errors.term && (
                <p className="text-sm text-red-500">{errors.term}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-definition">
                Định nghĩa (Mặt sau) <span className="text-red-500">*</span>
              </Label>
              <RichTextEditor
                value={definition}
                onChange={setDefinition}
                placeholder="Nhập định nghĩa..."
              />
              {errors.definition && (
                <p className="text-sm text-red-500">{errors.definition}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-example">Ví dụ (Tùy chọn)</Label>
              <RichTextEditor
                value={example}
                onChange={setExample}
                placeholder="Nhập ví dụ..."
              />
            </div>

            {/* Image Upload Section */}
            <div className="grid gap-2">
              <Label>Hình ảnh (Tùy chọn)</Label>

              {!imageUrl && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="edit-image-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang upload...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Upload hình ảnh
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hỗ trợ: JPEG, PNG, GIF, WebP (tối đa 5MB)
                  </p>
                </div>
              )}

              {imageUrl && (
                <div className="relative border rounded-lg p-2 bg-muted/50">
                  <div className="relative w-full h-40">
                    <Image
                      src={imageUrl}
                      alt="Preview"
                      fill
                      className="object-contain rounded"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
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
