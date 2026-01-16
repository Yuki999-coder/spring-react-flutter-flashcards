"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import { StatisticsSummary, StudyMode } from "@/types/statistics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BookOpen,
  Brain,
  Grid3x3,
  ClipboardList,
  Flame,
  Clock,
  Star,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { TestHistoryModal } from "./TestHistoryModal";

interface MasteryLevel {
  name: string;
  key: "newCards" | "stillLearning" | "almostDone" | "mastered";
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  description: string;
  route?: string;
}

interface StudyAnalyticsProps {
  deckId?: number;
}

export function StudyAnalytics({ deckId }: StudyAnalyticsProps) {
  const router = useRouter();
  const [statistics, setStatistics] = useState<StatisticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<string>("all");
  const [isTestHistoryOpen, setIsTestHistoryOpen] = useState(false);

  const formatRelativeTime = (dateTime: string | null): string => {
    if (!dateTime) return "Never";
    
    const now = new Date();
    const then = new Date(dateTime);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
    
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(seconds / 86400);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  };

  const masteryLevels: MasteryLevel[] = [
    {
      name: "New Cards",
      key: "newCards",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      icon: <Star className="h-4 w-4 text-purple-600" />,
      description: "Chưa học bao giờ",
    },
    {
      name: "Still Learning",
      key: "stillLearning",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      icon: <Brain className="h-4 w-4 text-blue-600" />,
      description: "Đang học",
    },
    {
      name: "Almost Done",
      key: "almostDone",
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      icon: <TrendingUp className="h-4 w-4 text-orange-600" />,
      description: "Sắp thuộc (< 21 ngày)",
    },
    {
      name: "Mastered",
      key: "mastered",
      color: "text-green-600",
      bgColor: "bg-green-100",
      icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
      description: "Đã thuộc (≥ 21 ngày)",
    },
  ];

  const studyModes = [
    { id: "all", name: "All Modes", icon: <Clock className="h-4 w-4" /> },
    { id: "learn", name: "Learn", icon: <Brain className="h-4 w-4" /> },
    { id: "test", name: "Practice Test", icon: <ClipboardList className="h-4 w-4" /> },
    { id: "match", name: "Matching", icon: <Grid3x3 className="h-4 w-4" /> },
    { id: "srs", name: "Spaced Repetition", icon: <Flame className="h-4 w-4" /> },
  ];

  useEffect(() => {
    fetchStatistics();
  }, [deckId]);

  // Refetch when page becomes visible (user returns from study session)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchStatistics();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [deckId]);

  const fetchStatistics = async () => {
    setIsLoading(true);
    try {
      const url = deckId 
        ? `/statistics/summary/enhanced?deckId=${deckId}`
        : "/statistics/summary/enhanced";
      const response = await api.get(url);
      setStatistics(response.data);
    } catch (error: any) {
      console.error("Failed to fetch statistics:", error);
      toast.error("Không thể tải thống kê");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudyLevel = (level: MasteryLevel) => {
    toast.info(`Đang phát triển: Học các thẻ "${level.name}"`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!statistics) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Không có dữ liệu thống kê
          </p>
        </CardContent>
      </Card>
    );
  }

  const { masteryLevels: levels } = statistics;
  const learnDetail = statistics.studyTime.modeDetails?.learn;
  const testDetail = statistics.studyTime.modeDetails?.test;
  const matchDetail = statistics.studyTime.modeDetails?.match;
  const srsDetail = statistics.studyTime.modeDetails?.srs;

  return (
    <div className="space-y-6">
      {/* Mode Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Study Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {studyModes.map((mode) => (
              <Button
                key={mode.id}
                variant={selectedMode === mode.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMode(mode.id)}
                className="flex items-center gap-2"
              >
                {mode.icon}
                <span>{mode.name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* All Modes - Mastery Levels */}
      {selectedMode === "all" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Mastery Levels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {masteryLevels.map((level) => {
                const count = levels[level.key];
                const percentage = levels.total > 0 
                  ? (count / levels.total) * 100 
                  : 0;

                return (
                  <div key={level.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${level.bgColor}`}>
                          {level.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{level.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {level.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold">{count}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStudyLevel(level)}
                          disabled={count === 0}
                        >
                          Study
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={percentage}
                        className="flex-1"
                        indicatorClassName={level.color.replace("text-", "bg-")}
                      />
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* All Modes - Study Details */}
          <Card>
            <CardHeader>
              <CardTitle>Study Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Learn */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-4 border rounded-lg hover:bg-accent cursor-help">
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="h-4 w-4 text-blue-600" />
                          <p className="font-semibold">Learn</p>
                        </div>
                        <p className="text-2xl font-bold">
                          {learnDetail?.timeSpentFormatted || "Not started"}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p><strong>Đã hoàn thành:</strong> {learnDetail?.isCompleted ? "Có" : "Không"}</p>
                        <p><strong>Lần hoạt động cuối cùng:</strong> {formatRelativeTime(learnDetail?.lastActive || null)}</p>
                        <p><strong>Thời gian thực hiện:</strong> {learnDetail?.timeSpentFormatted || "0"}</p>
                        <p><strong>Số lá bài đã thấy:</strong> {learnDetail?.cardsSeen || 0}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Test */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-4 border rounded-lg hover:bg-accent cursor-help">
                        <div className="flex items-center gap-2 mb-2">
                          <ClipboardList className="h-4 w-4 text-purple-600" />
                          <p className="font-semibold">Practice Test</p>
                        </div>
                        <p className="text-2xl font-bold">
                          {testDetail?.timeSpentFormatted || "Not started"}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p><strong>Time Spent:</strong> {testDetail?.timeSpentFormatted || "0"}</p>
                        <p><strong>Cards Seen:</strong> {testDetail?.cardsSeen || 0}</p>
                        <p><strong>Average Grade:</strong> {testDetail?.averageGrade?.toFixed(2) || "N/A"}</p>
                        <p><strong>Last Submission:</strong> {testDetail?.lastSubmission ? new Date(testDetail.lastSubmission).toLocaleDateString() : "N/A"}</p>
                        <p><strong>Test History:</strong> {testDetail?.testHistory || 0}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Matching */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-4 border rounded-lg hover:bg-accent cursor-help">
                        <div className="flex items-center gap-2 mb-2">
                          <Grid3x3 className="h-4 w-4 text-green-600" />
                          <p className="font-semibold">Matching</p>
                        </div>
                        <p className="text-2xl font-bold">
                          {matchDetail?.timeSpentFormatted || "Not started"}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p><strong>Last Active:</strong> {formatRelativeTime(matchDetail?.lastActive || null)}</p>
                        <p><strong>Time Spent:</strong> {matchDetail?.timeSpentFormatted || "0"}</p>
                        <p><strong>Cards Seen:</strong> {matchDetail?.cardsSeen || 0}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Spaced Repetition */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-4 border rounded-lg hover:bg-accent cursor-help">
                        <div className="flex items-center gap-2 mb-2">
                          <Flame className="h-4 w-4 text-orange-600" />
                          <p className="font-semibold">Spaced Repetition</p>
                        </div>
                        <p className="text-2xl font-bold">
                          {srsDetail?.timeSpentFormatted || "Not started"}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p><strong>Last Active:</strong> {formatRelativeTime(srsDetail?.lastActive || null)}</p>
                        <p><strong>Time Spent:</strong> {srsDetail?.timeSpentFormatted || "0"}</p>
                        <p><strong>Cards Seen:</strong> {srsDetail?.cardsSeen || 0}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Mastery Percentage */}
                <div className="p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-purple-50">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    <p className="font-semibold">Độ thành thạo</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">
                    {levels.total > 0 
                      ? ((levels.mastered / levels.total) * 100).toFixed(1)
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {levels.mastered}/{levels.total} thẻ đã thuộc
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Learn Mode */}
      {selectedMode === "learn" && (
        <Card>
          <CardHeader>
            <CardTitle>Learn Mode Details</CardTitle>
          </CardHeader>
          <CardContent>
            {learnDetail ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Started */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-4 border rounded-lg hover:bg-accent cursor-help">
                        <p className="text-sm text-muted-foreground mb-1">Started</p>
                        <p className="text-2xl font-bold">{learnDetail.timeSpentFormatted}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p><strong>Completed:</strong> {learnDetail.isCompleted ? "Yes" : "No"}</p>
                        <p><strong>Last Active:</strong> {learnDetail.lastActiveFormatted}</p>
                        <p><strong>Time Spent:</strong> {learnDetail.timeSpentFormatted}</p>
                        <p><strong>Cards Seen:</strong> {learnDetail.cardsSeen}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Cards Seen */}
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Cards Seen</p>
                  <p className="text-2xl font-bold">{learnDetail.cardsSeen}</p>
                </div>

                {/* Time Spent */}
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Time Spent</p>
                  <p className="text-2xl font-bold">{learnDetail.timeSpentFormatted}</p>
                </div>

                {/* Last Active */}
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Last Active</p>
                  <p className="text-lg font-bold">{learnDetail.lastActiveFormatted}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">Chưa có dữ liệu</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Practice Test Mode */}
      {selectedMode === "test" && (
        <Card>
          <CardHeader>
            <CardTitle>Practice Test Details</CardTitle>
          </CardHeader>
          <CardContent>
            {testDetail ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Avg Grade */}
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Avg Grade</p>
                  <p className="text-2xl font-bold">
                    {testDetail.averageGrade ? `${testDetail.averageGrade.toFixed(2)}%` : "N/A"}
                  </p>
                </div>

                {/* Practice Tests */}
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Practice Tests</p>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-2xl font-bold"
                    onClick={() => setIsTestHistoryOpen(true)}
                    disabled={!testDetail.testHistory || testDetail.testHistory === 0}
                  >
                    {testDetail.testHistory || 0} tests
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">Click to view details</p>
                </div>

                {/* Last Submission */}
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Last Submission</p>
                  <p className="text-lg font-bold">
                    {testDetail.lastSubmissionFormatted || "Never"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">Chưa có dữ liệu</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Matching Mode */}
      {selectedMode === "match" && (
        <Card>
          <CardHeader>
            <CardTitle>Matching Details</CardTitle>
          </CardHeader>
          <CardContent>
            {matchDetail ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Started */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-4 border rounded-lg hover:bg-accent cursor-help">
                        <p className="text-sm text-muted-foreground mb-1">Started</p>
                        <p className="text-2xl font-bold">{matchDetail.timeSpentFormatted}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p><strong>Last Active:</strong> {matchDetail.lastActiveFormatted}</p>
                        <p><strong>Time Spent:</strong> {matchDetail.timeSpentFormatted}</p>
                        <p><strong>Cards Seen:</strong> {matchDetail.cardsSeen}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Cards Seen */}
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Cards Seen</p>
                  <p className="text-2xl font-bold">{matchDetail.cardsSeen}</p>
                </div>

                {/* Time Spent */}
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Time Spent</p>
                  <p className="text-2xl font-bold">{matchDetail.timeSpentFormatted}</p>
                </div>

                {/* Last Active */}
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Last Active</p>
                  <p className="text-lg font-bold">{matchDetail.lastActiveFormatted}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">Chưa có dữ liệu</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Spaced Repetition Mode */}
      {selectedMode === "srs" && (
        <Card>
          <CardHeader>
            <CardTitle>Spaced Repetition Details</CardTitle>
          </CardHeader>
          <CardContent>
            {srsDetail ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Started */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-4 border rounded-lg hover:bg-accent cursor-help">
                        <p className="text-sm text-muted-foreground mb-1">Started</p>
                        <p className="text-2xl font-bold">{srsDetail.timeSpentFormatted}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p><strong>Last Active:</strong> {srsDetail.lastActiveFormatted}</p>
                        <p><strong>Time Spent:</strong> {srsDetail.timeSpentFormatted}</p>
                        <p><strong>Cards Seen:</strong> {srsDetail.cardsSeen}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Cards Seen */}
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Cards Seen</p>
                  <p className="text-2xl font-bold">{srsDetail.cardsSeen}</p>
                </div>

                {/* Time Spent */}
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Time Spent</p>
                  <p className="text-2xl font-bold">{srsDetail.timeSpentFormatted}</p>
                </div>

                {/* Last Active */}
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Last Active</p>
                  <p className="text-lg font-bold">{srsDetail.lastActiveFormatted}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">Chưa có dữ liệu</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Test History Modal */}
      {deckId && (
        <TestHistoryModal
          isOpen={isTestHistoryOpen}
          onClose={() => setIsTestHistoryOpen(false)}
          deckId={deckId}
        />
      )}
    </div>
  );
}
