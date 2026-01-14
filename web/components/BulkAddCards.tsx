"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Upload,
  ArrowLeft,
  Save,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { api } from "@/lib/axios";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import {
  RichTextEditor,
  RichTextEditorRef,
} from "@/components/ui/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const cardSchema = z.object({
  term: z.string().min(1, "Term không được để trống"),
  definition: z.string().min(1, "Definition không được để trống"),
  example: z.string().optional(),
  imageUrl: z.string().optional(),
});

const bulkCardsSchema = z.object({
  cards: z.array(cardSchema).min(1, "Phải có ít nhất 1 thẻ"),
});

type BulkCardsForm = z.infer<typeof bulkCardsSchema>;

interface BulkAddCardsProps {
  deckId: string;
  onSuccess?: () => void;
}

export function BulkAddCards({ deckId, onSuccess }: BulkAddCardsProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingIndexes, setUploadingIndexes] = useState<Set<number>>(
    new Set()
  );
  const termRefs = useRef<(RichTextEditorRef | null)[]>([]);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<BulkCardsForm>({
    resolver: zodResolver(bulkCardsSchema),
    defaultValues: {
      cards: [
        { term: "", definition: "", example: "", imageUrl: "" },
        { term: "", definition: "", example: "", imageUrl: "" },
        { term: "", definition: "", example: "", imageUrl: "" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "cards",
  });

  const cards = watch("cards");

  const handleImageUpload = async (index: number, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Kích thước ảnh phải nhỏ hơn 5MB");
      return;
    }

    setUploadingIndexes((prev) => new Set(prev).add(index));

    try {
      const imageUrl = await uploadImageToCloudinary(file);
      setValue(`cards.${index}.imageUrl`, imageUrl);
      toast.success("Tải ảnh lên thành công!");
    } catch (error: any) {
      toast.error(error.message || "Không thể tải ảnh lên");
    } finally {
      setUploadingIndexes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  };

  const onSubmit = async (data: BulkCardsForm) => {
    // Helper function to clean HTML and check if it has actual content
    const hasContent = (html: string): boolean => {
      const text = html.replace(/<[^>]*>/g, "").trim();
      return text !== "";
    };

    // Filter and clean cards
    const validCards = data.cards
      .filter((card) => hasContent(card.term) && hasContent(card.definition))
      .map((card) => ({
        ...card,
        // If example is empty HTML, set to empty string
        example: hasContent(card.example || "") ? card.example : "",
      }));

    if (validCards.length === 0) {
      toast.error("Phải có ít nhất 1 thẻ có nội dung");
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post(`/decks/${deckId}/cards/bulk`, validCards);
      toast.success(`Đã thêm ${validCards.length} thẻ thành công! 🎉`);

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/decks/${deckId}`);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Không thể thêm thẻ";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addCard = () => {
    append({ term: "", definition: "", example: "", imageUrl: "" });

    // Scroll to bottom after adding
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 100);
  };

  const removeCard = (index: number) => {
    if (fields.length <= 1) {
      toast.error("Phải có ít nhất 1 thẻ");
      return;
    }
    remove(index);
    toast.success("Đã xóa thẻ");
  };

  // Keyboard shortcut: Ctrl+Enter to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit(onSubmit)();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSubmit, onSubmit]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-24">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/decks/${deckId}`)}
              disabled={isSubmitting}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại
            </Button>
            <h1 className="text-2xl font-bold">Thêm thẻ hàng loạt</h1>
            <div className="w-24" /> {/* Spacer */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Mẹo:</strong> Nhấn{" "}
                <kbd className="px-2 py-1 bg-white rounded border">Tab</kbd> để
                di chuyển giữa các ô. Nhấn{" "}
                <kbd className="px-2 py-1 bg-white rounded border">Ctrl</kbd> +{" "}
                <kbd className="px-2 py-1 bg-white rounded border">Enter</kbd>{" "}
                để lưu nhanh.
              </p>
            </CardContent>
          </Card>

          {/* Cards List */}
          <div className="space-y-4">
            {fields.map((field, index) => (
              <Card
                key={field.id}
                className={cn(
                  "transition-all duration-300 hover:shadow-lg",
                  errors.cards?.[index] && "border-red-500"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Thẻ #{index + 1}</CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCard(index)}
                      disabled={fields.length <= 1 || isSubmitting}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Term */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Term <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      control={control}
                      name={`cards.${index}.term`}
                      render={({ field }) => (
                        <RichTextEditor
                          ref={(el) => (termRefs.current[index] = el)}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Nhập thuật ngữ..."
                          disabled={isSubmitting}
                        />
                      )}
                    />
                    {errors.cards?.[index]?.term && (
                      <p className="text-sm text-red-600">
                        {errors.cards[index]?.term?.message}
                      </p>
                    )}
                  </div>

                  {/* Definition */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Definition <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      control={control}
                      name={`cards.${index}.definition`}
                      render={({ field }) => (
                        <RichTextEditor
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Nhập định nghĩa..."
                          disabled={isSubmitting}
                        />
                      )}
                    />
                    {errors.cards?.[index]?.definition && (
                      <p className="text-sm text-red-600">
                        {errors.cards[index]?.definition?.message}
                      </p>
                    )}
                  </div>

                  {/* Example (Optional) */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Example (Tùy chọn)
                    </label>
                    <Controller
                      control={control}
                      name={`cards.${index}.example`}
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder="Ví dụ..."
                          disabled={isSubmitting}
                        />
                      )}
                    />
                  </div>

                  {/* Image Upload */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Hình ảnh (Tùy chọn)
                    </label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(index, file);
                          }
                        }}
                        disabled={isSubmitting || uploadingIndexes.has(index)}
                        className="hidden"
                        id={`image-upload-${index}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          document
                            .getElementById(`image-upload-${index}`)
                            ?.click()
                        }
                        disabled={isSubmitting || uploadingIndexes.has(index)}
                      >
                        {uploadingIndexes.has(index) ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Đang tải...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Tải ảnh lên
                          </>
                        )}
                      </Button>

                      {cards[index]?.imageUrl && (
                        <div className="relative group">
                          <div className="relative h-16 w-16 rounded overflow-hidden border">
                            <img
                              src={cards[index].imageUrl}
                              alt="Preview"
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() =>
                              setValue(`cards.${index}.imageUrl`, "")
                            }
                          >
                            ×
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add Card Button */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={addCard}
            disabled={isSubmitting}
            className="w-full border-dashed border-2 hover:border-primary"
          >
            <Plus className="mr-2 h-5 w-5" />
            Thêm thẻ
          </Button>
        </form>
      </main>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{fields.length} thẻ</p>
            <Button
              size="lg"
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting || fields.length === 0}
              className="min-w-[200px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  Lưu tất cả
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
