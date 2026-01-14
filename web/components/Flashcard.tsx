"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Volume2 } from "lucide-react";
import { Card } from "@/types/card";
import { useTTS } from "@/hooks/use-tts";
import { Button } from "@/components/ui/button";

interface FlashcardProps {
  card: Card;
  isFlipped: boolean;
  onFlip: () => void;
}

export function Flashcard({ card, isFlipped, onFlip }: FlashcardProps) {
  const { speak } = useTTS();

  const handleSpeakTerm = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card flip
    speak(card.term, "en-US");
  };

  const handleSpeakDefinition = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card flip
    speak(card.definition, "en-US");
  };

  return (
    <div className="perspective-1000 w-full max-w-2xl mx-auto">
      <motion.div
        className="relative w-full h-96 cursor-pointer"
        onClick={onFlip}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Front Side - Term */}
        <div
          className="absolute inset-0 w-full h-full backface-hidden"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="w-full h-full bg-white rounded-3xl shadow-2xl border border-primary/10 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
            <div className="text-xs font-semibold text-primary mb-4 uppercase tracking-widest bg-primary/10 px-4 py-1.5 rounded-full">
              Thuật ngữ
            </div>

            {/* Image nếu có */}
            {card.imageUrl && (
              <div className="relative w-full max-w-sm h-32 mb-6">
                <Image
                  src={card.imageUrl}
                  alt={card.term}
                  fill
                  className="object-contain rounded-xl shadow-md"
                />
              </div>
            )}

            <div className="relative w-full flex items-center justify-center gap-3">
              <div
                className="text-4xl font-bold text-center break-words prose prose-xl max-w-none flex-1 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text"
                dangerouslySetInnerHTML={{ __html: card.term }}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSpeakTerm}
                className="flex-shrink-0 hover:bg-primary/10 hover:text-primary transition-all rounded-xl shadow-sm hover:shadow-md"
                title="Nghe phát âm"
              >
                <Volume2 className="h-6 w-6" />
              </Button>
            </div>
            <div className="absolute bottom-8 text-xs text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
              Nhấn Space hoặc click để xem định nghĩa
            </div>
          </div>
        </div>

        {/* Back Side - Definition */}
        <div
          className="absolute inset-0 w-full h-full backface-hidden"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="w-full h-full bg-gradient-to-br from-primary/10 via-violet-50/50 to-purple-50/30 rounded-3xl shadow-2xl border-2 border-primary/20 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
            <div className="text-xs font-semibold text-primary mb-4 uppercase tracking-widest bg-white/80 px-4 py-1.5 rounded-full shadow-sm">
              Định nghĩa
            </div>
            <div className="relative w-full flex items-center justify-center gap-3">
              <div
                className="text-3xl font-semibold text-center mb-6 break-words prose prose-xl max-w-none flex-1"
                dangerouslySetInnerHTML={{ __html: card.definition }}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSpeakDefinition}
                className="flex-shrink-0 hover:bg-white/80 hover:text-primary transition-all mb-6 rounded-xl shadow-sm hover:shadow-md"
                title="Nghe phát âm"
              >
                <Volume2 className="h-6 w-6" />
              </Button>
            </div>
            {card.example && (
              <div className="mt-4 p-5 bg-white/80 rounded-2xl border border-primary/20 max-w-md shadow-lg backdrop-blur-sm">
                <div className="text-xs text-primary font-semibold mb-2 uppercase tracking-wider">
                  Ví dụ
                </div>
                <div
                  className="text-base italic prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: card.example }}
                />
              </div>
            )}
            <div className="absolute bottom-8 text-xs text-muted-foreground bg-white/60 px-4 py-2 rounded-full shadow-sm">
              Đánh giá mức độ nhớ bên dưới
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
