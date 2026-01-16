"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/axios";
import { StudyMode } from "@/types/statistics";
import { toast } from "sonner";

interface UseStudyTimerOptions {
  mode: StudyMode;
  deckId?: number;
  enabled?: boolean;
  onSessionSaved?: () => void;
}

export function useStudyTimer({
  mode,
  deckId,
  enabled = true,
  onSessionSaved,
}: UseStudyTimerOptions) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const startTimeRef = useRef<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const cardIdsStudiedRef = useRef<Set<number>>(new Set());

  // Start tracking
  useEffect(() => {
    if (!enabled) return;

    startTimeRef.current = new Date();
    setIsTracking(true);

    // Update elapsed time every second
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const now = new Date();
        const seconds = Math.floor(
          (now.getTime() - startTimeRef.current.getTime()) / 1000
        );
        setElapsedSeconds(seconds);
      }
    }, 1000);

    return () => {
      // Cleanup on unmount - save session
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      if (startTimeRef.current && isTracking) {
        saveSession();
      }
    };
  }, [enabled, mode, deckId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveSession = async () => {
    if (!startTimeRef.current) return;

    const endTime = new Date();
    const durationSeconds = Math.floor(
      (endTime.getTime() - startTimeRef.current.getTime()) / 1000
    );

    // Only save if session is at least 5 seconds
    if (durationSeconds < 5) {
      console.log("Session too short, not saving");
      return;
    }

    try {
      await api.post("/study-sessions", {
        deckId: deckId || null,
        mode,
        startTime: startTimeRef.current.toISOString(),
        endTime: endTime.toISOString(),
        cardsStudied: cardIdsStudiedRef.current.size > 0 ? cardIdsStudiedRef.current.size : null,
      });

      console.log(`Study session saved: ${durationSeconds}s in ${mode} mode, ${cardIdsStudiedRef.current.size} unique cards`);
      onSessionSaved?.();
    } catch (error: any) {
      console.error("Failed to save study session:", error);
      // Don't show toast error on unmount to avoid UI issues
    }
  };

  const incrementCardsStudied = (cardId?: number) => {
    if (cardId !== undefined) {
      cardIdsStudiedRef.current.add(cardId);
    }
  };

  const stopTracking = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsTracking(false);
    await saveSession();
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  return {
    elapsedSeconds,
    isTracking,
    formattedTime: formatTime(elapsedSeconds),
    incrementCardsStudied,
    stopTracking,
    cardsStudied: cardIdsStudiedRef.current.size,
  };
}
