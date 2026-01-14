"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface ReviewControlsProps {
  isVisible: boolean;
  onReview: (grade: "AGAIN" | "HARD" | "GOOD" | "EASY") => void;
  isLoading: boolean;
}

export function ReviewControls({
  isVisible,
  onReview,
  isLoading,
}: ReviewControlsProps) {
  if (!isVisible) return null;

  const buttons = [
    {
      grade: "AGAIN" as const,
      label: "Quên",
      key: "1",
      variant: "destructive" as const,
    },
    {
      grade: "HARD" as const,
      label: "Khó",
      key: "2",
      variant: "outline" as const,
      className: "border-orange-500 text-orange-600 hover:bg-orange-50",
    },
    {
      grade: "GOOD" as const,
      label: "Tốt",
      key: "3",
      variant: "default" as const,
    },
    {
      grade: "EASY" as const,
      label: "Dễ",
      key: "4",
      variant: "outline" as const,
      className: "border-green-500 text-green-600 hover:bg-green-50",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl mx-auto mt-8"
    >
      <div className="bg-white rounded-xl shadow-lg border p-6">
        <h3 className="text-center text-sm font-medium text-muted-foreground mb-4">
          Bạn nhớ thẻ này như thế nào?
        </h3>
        <div className="grid grid-cols-4 gap-3">
          {buttons.map((btn) => (
            <Button
              key={btn.grade}
              variant={btn.variant}
              onClick={() => onReview(btn.grade)}
              disabled={isLoading}
              className={btn.className}
              size="lg"
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-lg font-bold">{btn.label}</span>
                <span className="text-xs opacity-70">Phím {btn.key}</span>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
