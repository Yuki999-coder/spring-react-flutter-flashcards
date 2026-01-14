"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Card } from "@/types/card";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/useAuthStore";
import {
  generateTestQuestions,
  gradeTest,
  isAnswerCorrect,
  TestQuestion,
  TestConfig,
  TestResult,
} from "@/lib/testUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  Home,
} from "lucide-react";

type TestPhase = "CONFIG" | "TESTING" | "RESULT";

export default function TestPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = Number(params.deckId);
  const { isAuthenticated } = useAuthStore();

  const [phase, setPhase] = useState<TestPhase>("CONFIG");
  const [cards, setCards] = useState<Card[]>([]);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [result, setResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Config form
  const [numberOfQuestions, setNumberOfQuestions] = useState(10);
  const [includeMCQ, setIncludeMCQ] = useState(true);
  const [includeWritten, setIncludeWritten] = useState(true);
  const [includeTrueFalse, setIncludeTrueFalse] = useState(true);

  // Test form
  const { register, handleSubmit, setValue, watch } = useForm();

  // Fetch cards
  useEffect(() => {
    const fetchCards = async () => {
      try {
        if (!isAuthenticated()) {
          toast.error("Vui lòng đăng nhập");
          router.push("/login");
          return;
        }

        const response = await api.get(`/decks/${deckId}/cards`);
        setCards(response.data);
      } catch (error) {
        console.error("Error fetching cards:", error);
        toast.error("Không thể tải danh sách thẻ");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCards();
  }, [deckId, router, isAuthenticated]);

  // Start test
  const handleStartTest = () => {
    if (cards.length === 0) {
      toast.error("Bộ thẻ chưa có thẻ nào");
      return;
    }

    if (!includeMCQ && !includeWritten && !includeTrueFalse) {
      toast.error("Vui lòng chọn ít nhất 1 loại câu hỏi");
      return;
    }

    const config: TestConfig = {
      numberOfQuestions:
        numberOfQuestions === -1 ? cards.length : numberOfQuestions,
      includeTypes: {
        mcq: includeMCQ,
        written: includeWritten,
        trueFalse: includeTrueFalse,
      },
    };

    const generatedQuestions = generateTestQuestions(cards, config);
    setQuestions(generatedQuestions);
    setPhase("TESTING");
  };

  // Submit test
  const onSubmit = (data: any) => {
    // Update questions with user answers
    const answeredQuestions = questions.map((q) => {
      const answer = data[q.id];

      if (q.type === "MCQ") {
        return {
          ...q,
          userAnswer: answer !== undefined ? Number(answer) : undefined,
        };
      } else if (q.type === "WRITTEN") {
        return { ...q, userAnswer: answer || "" };
      } else if (q.type === "TRUE_FALSE") {
        return { ...q, userAnswer: answer === "true" };
      }

      return q;
    });

    const testResult = gradeTest(answeredQuestions);
    setResult(testResult);
    setPhase("RESULT");
  };

  // Restart test
  const handleRestartTest = () => {
    setPhase("CONFIG");
    setResult(null);
    setQuestions([]);
  };

  // Back to deck
  const handleBackToDeck = () => {
    router.push(`/decks/${deckId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Đang tải...</div>
      </div>
    );
  }

  // CONFIG PHASE
  if (phase === "CONFIG") {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <Button variant="ghost" onClick={handleBackToDeck} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>

          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">
              Cấu hình bài kiểm tra
            </h1>

            <div className="space-y-6">
              {/* Number of questions */}
              <div>
                <Label htmlFor="numQuestions" className="text-base font-medium">
                  Số lượng câu hỏi
                </Label>
                <select
                  id="numQuestions"
                  value={numberOfQuestions}
                  onChange={(e) => setNumberOfQuestions(Number(e.target.value))}
                  className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5}>5 câu</option>
                  <option value={10}>10 câu</option>
                  <option value={20}>20 câu</option>
                  <option value={-1}>Tất cả ({cards.length} câu)</option>
                </select>
              </div>

              {/* Question types */}
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Loại câu hỏi
                </Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="mcq"
                      checked={includeMCQ}
                      onCheckedChange={(checked) =>
                        setIncludeMCQ(checked as boolean)
                      }
                    />
                    <label
                      htmlFor="mcq"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Trắc nghiệm (Multiple Choice)
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="written"
                      checked={includeWritten}
                      onCheckedChange={(checked) =>
                        setIncludeWritten(checked as boolean)
                      }
                    />
                    <label
                      htmlFor="written"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Tự luận (Gõ phím)
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="trueFalse"
                      checked={includeTrueFalse}
                      onCheckedChange={(checked) =>
                        setIncludeTrueFalse(checked as boolean)
                      }
                    />
                    <label
                      htmlFor="trueFalse"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Đúng/Sai (True/False)
                    </label>
                  </div>
                </div>
              </div>

              {/* Start button */}
              <Button
                onClick={handleStartTest}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-medium"
                disabled={cards.length === 0}
              >
                Bắt đầu làm bài
              </Button>

              {cards.length === 0 && (
                <p className="text-sm text-red-500 text-center">
                  Bộ thẻ chưa có thẻ nào
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TESTING PHASE
  if (phase === "TESTING") {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-gray-800">Bài kiểm tra</h1>
              <div className="text-sm text-gray-600">
                {questions.length} câu hỏi
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="border border-gray-200 rounded-lg p-6 bg-gray-50"
                >
                  {/* Question header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-500 mb-2">
                        {question.type === "MCQ" && "Trắc nghiệm"}
                        {question.type === "WRITTEN" && "Tự luận"}
                        {question.type === "TRUE_FALSE" && "Đúng/Sai"}
                      </div>
                      <div
                        className="text-lg font-medium text-gray-800 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: question.question }}
                      />
                    </div>
                  </div>

                  {/* MCQ Options */}
                  {question.type === "MCQ" && question.options && (
                    <RadioGroup
                      onValueChange={(value) => setValue(question.id, value)}
                      className="space-y-3 ml-12"
                    >
                      {question.options.map((option, optionIndex) => (
                        <div
                          key={optionIndex}
                          className="flex items-start space-x-3"
                        >
                          <RadioGroupItem
                            value={String(optionIndex)}
                            id={`${question.id}-${optionIndex}`}
                          />
                          <label
                            htmlFor={`${question.id}-${optionIndex}`}
                            className="text-sm flex-1 cursor-pointer prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: option }}
                          />
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {/* Written Input */}
                  {question.type === "WRITTEN" && (
                    <div className="ml-12">
                      <Input
                        {...register(question.id)}
                        placeholder="Nhập câu trả lời của bạn..."
                        className="w-full"
                      />
                    </div>
                  )}

                  {/* True/False */}
                  {question.type === "TRUE_FALSE" && (
                    <div className="ml-12 space-y-4">
                      <div
                        className="text-sm text-gray-700 mb-3 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: question.correctAnswer,
                        }}
                      />
                      <RadioGroup
                        onValueChange={(value) => setValue(question.id, value)}
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem
                            value="true"
                            id={`${question.id}-true`}
                          />
                          <label
                            htmlFor={`${question.id}-true`}
                            className="text-sm cursor-pointer font-medium"
                          >
                            ✓ Đúng
                          </label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem
                            value="false"
                            id={`${question.id}-false`}
                          />
                          <label
                            htmlFor={`${question.id}-false`}
                            className="text-sm cursor-pointer font-medium"
                          >
                            ✗ Sai
                          </label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}
                </div>
              ))}

              {/* Submit button */}
              <div className="flex justify-center pt-6">
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-12 py-6 text-lg font-medium"
                >
                  Nộp bài
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // RESULT PHASE
  if (phase === "RESULT" && result) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Score card */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-8 mb-8 text-white">
            <div className="flex items-center justify-center mb-4">
              <Trophy className="w-16 h-16" />
            </div>
            <h1 className="text-4xl font-bold text-center mb-4">
              Kết quả bài kiểm tra
            </h1>
            <div className="text-center">
              <div className="text-6xl font-bold mb-2">{result.score}%</div>
              <div className="text-lg">
                {result.correctAnswers}/{result.totalQuestions} câu đúng
              </div>
            </div>
          </div>

          {/* Review answers */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Xem lại đáp án
            </h2>

            <div className="space-y-6">
              {result.questions.map((question, index) => {
                const isCorrect = isAnswerCorrect(question);

                return (
                  <div
                    key={question.id}
                    className={`border-l-4 ${
                      isCorrect
                        ? "border-green-500 bg-green-50"
                        : "border-red-500 bg-red-50"
                    } rounded-r-lg p-6`}
                  >
                    {/* Question header */}
                    <div className="flex items-start gap-3 mb-4">
                      {isCorrect ? (
                        <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                      )}
                      <div className="flex-1">
                        <div className="text-sm text-gray-500 mb-1">
                          Câu {index + 1} •{" "}
                          {question.type === "MCQ" && "Trắc nghiệm"}
                          {question.type === "WRITTEN" && "Tự luận"}
                          {question.type === "TRUE_FALSE" && "Đúng/Sai"}
                        </div>
                        <div
                          className="text-base font-medium text-gray-800 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: question.question,
                          }}
                        />
                      </div>
                    </div>

                    {/* Answer details */}
                    <div className="ml-9 space-y-2">
                      {/* MCQ */}
                      {question.type === "MCQ" && question.options && (
                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => {
                            const isUserAnswer =
                              question.userAnswer === optionIndex;
                            const isCorrectOption =
                              optionIndex === question.correctIndex;

                            return (
                              <div
                                key={optionIndex}
                                className={`px-3 py-2 rounded ${
                                  isCorrectOption
                                    ? "bg-green-100 border border-green-300"
                                    : isUserAnswer
                                    ? "bg-red-100 border border-red-300"
                                    : "bg-white border border-gray-200"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {isCorrectOption && (
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  )}
                                  {isUserAnswer && !isCorrectOption && (
                                    <XCircle className="w-4 h-4 text-red-600" />
                                  )}
                                  <div
                                    className="text-sm prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: option }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Written */}
                      {question.type === "WRITTEN" && (
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm font-medium text-gray-700">
                              Câu trả lời của bạn:
                            </span>
                            <div className="mt-1 text-sm text-gray-600">
                              {question.userAnswer || "(Không có)"}
                            </div>
                          </div>
                          {!isCorrect && (
                            <div>
                              <span className="text-sm font-medium text-green-700">
                                Đáp án đúng:
                              </span>
                              <div
                                className="mt-1 text-sm text-gray-600 prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{
                                  __html: question.correctAnswer,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* True/False */}
                      {question.type === "TRUE_FALSE" && (
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm font-medium text-gray-700">
                              Định nghĩa:
                            </span>
                            <div
                              className="mt-1 text-sm text-gray-600 prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{
                                __html: question.correctAnswer,
                              }}
                            />
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700">
                              Câu trả lời của bạn:
                            </span>
                            <div className="mt-1 text-sm text-gray-600">
                              {question.userAnswer === true
                                ? "✓ Đúng"
                                : question.userAnswer === false
                                ? "✗ Sai"
                                : "(Không có)"}
                            </div>
                          </div>
                          {!isCorrect && (
                            <div>
                              <span className="text-sm font-medium text-green-700">
                                Đáp án đúng:
                              </span>
                              <div className="mt-1 text-sm text-gray-600">
                                {question.isTrue ? "✓ Đúng" : "✗ Sai"}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4 justify-center">
            <Button
              onClick={handleRestartTest}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Làm bài kiểm tra mới
            </Button>
            <Button
              onClick={handleBackToDeck}
              variant="outline"
              className="px-8 py-6"
            >
              <Home className="w-5 h-5 mr-2" />
              Về trang chủ bộ thẻ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
