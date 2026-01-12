'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CreateCardRequest } from '@/types/card';

const createCardSchema = z.object({
  term: z.string().min(1, 'Thuật ngữ không được để trống'),
  definition: z.string().min(1, 'Định nghĩa không được để trống'),
  example: z.string().optional(),
});

type CreateCardFormData = z.infer<typeof createCardSchema>;

interface AddCardDialogProps {
  deckId: number;
  onCardAdded: () => void;
}

export function AddCardDialog({ deckId, onCardAdded }: AddCardDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateCardFormData>({
    resolver: zodResolver(createCardSchema),
  });

  const onSubmit = async (data: CreateCardFormData) => {
    setIsLoading(true);
    try {
      const payload: CreateCardRequest = {
        deckId: deckId,
        term: data.term,
        definition: data.definition,
        example: data.example || undefined,
      };

      await api.post(`/decks/${deckId}/cards`, payload);

      toast.success('Thêm thẻ thành công!');
      reset(); // Reset form nhưng KHÔNG đóng dialog
      onCardAdded(); // Refresh list
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Không thể thêm thẻ. Vui lòng thử lại.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Thêm thẻ
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Thêm thẻ mới</DialogTitle>
          <DialogDescription>
            Tạo một thẻ học tập mới. Bạn có thể tiếp tục thêm nhiều thẻ liên tiếp.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="term">
                Thuật ngữ (Mặt trước) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="term"
                placeholder="VD: apple"
                {...register('term')}
                className={errors.term ? 'border-red-500' : ''}
              />
              {errors.term && (
                <p className="text-sm text-red-500">{errors.term.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="definition">
                Định nghĩa (Mặt sau) <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="definition"
                placeholder="VD: quả táo"
                rows={3}
                {...register('definition')}
                className={errors.definition ? 'border-red-500' : ''}
              />
              {errors.definition && (
                <p className="text-sm text-red-500">
                  {errors.definition.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="example">Ví dụ (Tùy chọn)</Label>
              <Input
                id="example"
                placeholder="VD: I like apples."
                {...register('example')}
                className={errors.example ? 'border-red-500' : ''}
              />
              {errors.example && (
                <p className="text-sm text-red-500">{errors.example.message}</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Đóng
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Đang thêm...' : 'Thêm thẻ'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
