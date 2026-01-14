# Test Mode Documentation

## Tổng quan

Tính năng **Test** (Bài kiểm tra) là một chế độ học tập tổng hợp giống Quizlet, cho phép người dùng tự kiểm tra kiến thức với nhiều loại câu hỏi khác nhau.

## Đặc điểm chính

### 1. Ba giai đoạn (Phases)

#### Phase 1: CONFIG - Cấu hình bài kiểm tra

- **Số lượng câu hỏi**: Dropdown cho phép chọn 5, 10, 20 câu hoặc "Tất cả"
- **Loại câu hỏi**: Checkboxes để chọn kết hợp:
  - ✅ Trắc nghiệm (Multiple Choice)
  - ✅ Tự luận (Written/Gõ phím)
  - ✅ Đúng/Sai (True/False)
- **Validation**: Phải chọn ít nhất 1 loại câu hỏi
- **Nút "Bắt đầu làm bài"**: Chuyển sang Phase TESTING

#### Phase 2: TESTING - Làm bài

- **Layout**: List view (cuộn dọc) giống đề thi thật, khác với Learn Mode (từng câu một)
- **Câu hỏi được đánh số**: 1, 2, 3... trong badge xanh tròn
- **Rich text**: Hiển thị HTML formatting với `dangerouslySetInnerHTML`
- **Form management**: Sử dụng `react-hook-form` để quản lý nhiều câu trả lời
- **Không hiển thị đáp án**: Người dùng chọn/nhập mà không có feedback ngay
- **Nút "Nộp bài"**: Submit form và chuyển sang Phase RESULT

#### Phase 3: RESULT - Kết quả

- **Score card**: Gradient card hiển thị điểm % và số câu đúng/tổng số
- **Review section**: Danh sách chi tiết từng câu hỏi:
  - Border màu xanh (đúng) hoặc đỏ (sai)
  - Icon CheckCircle2/XCircle
  - Hiển thị câu trả lời của người dùng
  - Hiển thị đáp án đúng (nếu sai)
- **Action buttons**:
  - "Làm bài kiểm tra mới": Reset về Phase CONFIG
  - "Về trang chủ bộ thẻ": Quay về deck detail

---

## Logic tạo câu hỏi (testUtils.ts)

### Interface chính

```typescript
export interface TestQuestion {
  id: string; // Format: "mcq-123", "written-123", "tf-123"
  type: QuestionType; // 'MCQ' | 'WRITTEN' | 'TRUE_FALSE'
  cardId: number; // ID của thẻ gốc
  question: string; // Câu hỏi (HTML)
  correctAnswer: string; // Đáp án đúng (HTML)
  options?: string[]; // Mảng 4 đáp án (chỉ MCQ)
  correctIndex?: number; // Index đáp án đúng (chỉ MCQ)
  isTrue?: boolean; // true/false (chỉ TRUE_FALSE)
  userAnswer?: string | number | boolean; // Câu trả lời của user
}
```

### Hàm `generateTestQuestions(cards, config)`

**Input**:

- `cards: Card[]` - Danh sách thẻ của deck
- `config: TestConfig` - Cấu hình người dùng chọn

**Process**:

1. Filter loại câu hỏi được bật (enabledTypes)
2. Shuffle cards và chọn subset theo `numberOfQuestions`
3. Với mỗi card, random chọn 1 loại câu hỏi từ enabledTypes
4. Generate câu hỏi theo loại:
   - **MCQ**: `generateMCQ(card, allCards)`
   - **WRITTEN**: `generateWritten(card)`
   - **TRUE_FALSE**: `generateTrueFalse(card, allCards)`
5. Shuffle lại toàn bộ questions để trộn lẫn các loại

**Output**: `TestQuestion[]` - Mảng câu hỏi đã shuffle

---

## Chi tiết từng loại câu hỏi

### 1. Multiple Choice (Trắc nghiệm)

**Cấu trúc**:

- **Question**: card.term (HTML)
- **Options**: 4 đáp án
  - 1 đáp án đúng: card.definition
  - 3 đáp án sai: definition từ 3 thẻ khác (random)
- **Shuffle**: Trộn 4 đáp án, lưu `correctIndex`

**UI**:

- RadioGroup với 4 RadioGroupItem
- Hiển thị HTML cho mỗi option
- Không tô màu khi đang làm

**Chấm điểm**:

```typescript
isCorrect = question.userAnswer === question.correctIndex;
```

**Review**:

- Option đúng: bg-green-100 border-green-300 + CheckCircle2 icon
- Option user chọn sai: bg-red-100 border-red-300 + XCircle icon
- Options khác: bg-white border-gray-200

---

### 2. Written (Tự luận)

**Cấu trúc**:

- **Question**: card.definition (HTML) - Hỏi nghĩa, yêu cầu gõ thuật ngữ
- **Correct answer**: card.term (HTML)

**UI**:

- Input field đơn giản
- Placeholder: "Nhập câu trả lời của bạn..."

**Chấm điểm**:

```typescript
function checkWrittenAnswer(
  userAnswer: string,
  correctAnswer: string
): boolean {
  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();
  const normalize = (text: string) => stripHtml(text).toLowerCase().trim();
  return normalize(userAnswer) === normalize(correctAnswer);
}
```

- Strip HTML tags
- Lowercase
- Trim whitespace
- So sánh chính xác

**Review**:

- Hiển thị câu trả lời của user (plain text)
- Nếu sai: Hiển thị đáp án đúng (HTML)

---

### 3. True/False (Đúng/Sai)

**Cấu trúc**:

- **Question**: card.term (HTML)
- **Display**: Một definition (đúng hoặc sai)
- **Logic**:
  - 50% cặp ĐÚNG: Term A + Definition A → isTrue = true
  - 50% cặp SAI: Term A + Definition B (random) → isTrue = false

**UI**:

- Hiển thị question (term)
- Hiển thị definition
- RadioGroup với 2 options:
  - ✓ Đúng (value="true")
  - ✗ Sai (value="false")

**Chấm điểm**:

```typescript
isCorrect = question.userAnswer === question.isTrue;
```

- userAnswer là boolean (true/false)
- So sánh với isTrue

**Review**:

- Hiển thị definition đã cho
- Hiển thị câu trả lời user chọn: "✓ Đúng" hoặc "✗ Sai"
- Nếu sai: Hiển thị đáp án đúng

---

## Công thức tính điểm

### Hàm `gradeTest(questions)`

**Process**:

1. Loop qua từng question
2. Kiểm tra `userAnswer` theo loại:
   - MCQ: `userAnswer === correctIndex`
   - WRITTEN: `checkWrittenAnswer(userAnswer, correctAnswer)`
   - TRUE_FALSE: `userAnswer === isTrue`
3. Đếm số câu đúng (correctCount)
4. Tính điểm: `score = round((correctCount / totalQuestions) * 100)`

**Output**:

```typescript
interface TestResult {
  totalQuestions: number; // Tổng số câu
  correctAnswers: number; // Số câu đúng
  score: number; // Điểm % (0-100)
  questions: TestQuestion[]; // Mảng câu hỏi đã chấm
}
```

---

## UI Components

### CONFIG Phase

```tsx
<select onChange={(e) => setNumberOfQuestions(Number(e.target.value))}>
  <option value={5}>5 câu</option>
  <option value={10}>10 câu</option>
  <option value={20}>20 câu</option>
  <option value={-1}>Tất cả ({cards.length} câu)</option>
</select>

<Checkbox checked={includeMCQ} onCheckedChange={setIncludeMCQ} />
<Checkbox checked={includeWritten} onCheckedChange={setIncludeWritten} />
<Checkbox checked={includeTrueFalse} onCheckedChange={setIncludeTrueFalse} />

<Button onClick={handleStartTest}>Bắt đầu làm bài</Button>
```

### TESTING Phase

```tsx
<form onSubmit={handleSubmit(onSubmit)}>
  {questions.map((question, index) => (
    <div key={question.id} className="border rounded-lg p-6">
      {/* Question number badge */}
      <div className="w-8 h-8 bg-blue-600 text-white rounded-full">
        {index + 1}
      </div>

      {/* Question content */}
      <div dangerouslySetInnerHTML={{ __html: question.question }} />

      {/* Answer input based on type */}
      {question.type === "MCQ" && (
        <RadioGroup onValueChange={(value) => setValue(question.id, value)}>
          {question.options.map((option, i) => (
            <RadioGroupItem value={String(i)} />
          ))}
        </RadioGroup>
      )}

      {question.type === "WRITTEN" && (
        <Input {...register(question.id)} placeholder="Nhập câu trả lời..." />
      )}

      {question.type === "TRUE_FALSE" && (
        <RadioGroup onValueChange={(value) => setValue(question.id, value)}>
          <RadioGroupItem value="true" /> Đúng
          <RadioGroupItem value="false" /> Sai
        </RadioGroup>
      )}
    </div>
  ))}

  <Button type="submit">Nộp bài</Button>
</form>
```

### RESULT Phase

```tsx
{/* Score card */}
<div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
  <Trophy className="w-16 h-16" />
  <div className="text-6xl font-bold">{result.score}%</div>
  <div>{result.correctAnswers}/{result.totalQuestions} câu đúng</div>
</div>

{/* Review list */}
{result.questions.map((question, index) => {
  const isCorrect = isAnswerCorrect(question);
  return (
    <div className={`border-l-4 ${isCorrect ? 'border-green-500' : 'border-red-500'}`}>
      {isCorrect ? <CheckCircle2 /> : <XCircle />}
      {/* Question details */}
      {/* User answer */}
      {/* Correct answer (if wrong) */}
    </div>
  );
})}

{/* Action buttons */}
<Button onClick={handleRestartTest}>
  <RotateCcw /> Làm bài kiểm tra mới
</Button>
<Button onClick={handleBackToDeck}>
  <Home /> Về trang chủ bộ thẻ
</Button>
```

---

## State Management

### Phase States

```typescript
type TestPhase = "CONFIG" | "TESTING" | "RESULT";
const [phase, setPhase] = useState<TestPhase>("CONFIG");
```

### Data States

```typescript
const [cards, setCards] = useState<Card[]>([]); // Thẻ từ deck
const [questions, setQuestions] = useState<TestQuestion[]>([]); // Câu hỏi đã tạo
const [result, setResult] = useState<TestResult | null>(null); // Kết quả bài thi
```

### Config States

```typescript
const [numberOfQuestions, setNumberOfQuestions] = useState(10);
const [includeMCQ, setIncludeMCQ] = useState(true);
const [includeWritten, setIncludeWritten] = useState(true);
const [includeTrueFalse, setIncludeTrueFalse] = useState(true);
```

### Form State (react-hook-form)

```typescript
const { register, handleSubmit, setValue, watch } = useForm();
```

---

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        TEST MODE FLOW                            │
└─────────────────────────────────────────────────────────────────┘

    START
      │
      ▼
┌───────────────┐
│  Fetch Cards  │
└───────┬───────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                       PHASE 1: CONFIG                            │
├─────────────────────────────────────────────────────────────────┤
│  • Select số lượng câu (5/10/20/All)                            │
│  • Check loại câu (MCQ/Written/True-False)                      │
│  • Click "Bắt đầu làm bài"                                      │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        │ handleStartTest()
                        ▼
        ┌──────────────────────────────┐
        │ generateTestQuestions()       │
        │  • Shuffle cards             │
        │  • Select subset             │
        │  • Generate questions        │
        │  • Shuffle questions         │
        └────────────┬─────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                       PHASE 2: TESTING                           │
├─────────────────────────────────────────────────────────────────┤
│  • Display all questions (list view)                            │
│  • User fills answers (MCQ/Written/TF)                          │
│  • Click "Nộp bài"                                              │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        │ handleSubmit(onSubmit)
                        ▼
        ┌──────────────────────────────┐
        │ gradeTest()                   │
        │  • Loop questions            │
        │  • Check answers             │
        │  • Count correct             │
        │  • Calculate score %         │
        └────────────┬─────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                       PHASE 3: RESULT                            │
├─────────────────────────────────────────────────────────────────┤
│  • Show score % + correct/total                                 │
│  • Review each question (correct/wrong)                         │
│  • Show user answer vs correct answer                           │
│  • Actions: Restart / Back to deck                              │
└───────────────────────┬─────────────────────────────────────────┘
                        │
            ┌───────────┴───────────┐
            │                       │
            ▼                       ▼
    handleRestartTest()     handleBackToDeck()
            │                       │
            │                       ▼
            │                   Deck Detail
            │
            ▼
    Back to CONFIG
```

---

## Tích hợp với Deck Page

### Thêm nút Test

**File**: `web/app/decks/[deckId]/page.tsx`

```tsx
import { ClipboardList } from "lucide-react";

const handleTest = () => {
  if (!deck || cards.length === 0) return;
  router.push(`/decks/${deckId}/test`);
};

<Tooltip>
  <TooltipTrigger asChild>
    <span>
      <Button
        onClick={handleTest}
        disabled={cards.length === 0}
        variant="outline"
      >
        <ClipboardList className="mr-2 h-4 w-4" />
        Test
      </Button>
    </span>
  </TooltipTrigger>
  {cards.length === 0 && (
    <TooltipContent>
      <p>Cần có ít nhất 1 thẻ để làm bài kiểm tra</p>
    </TooltipContent>
  )}
</Tooltip>;
```

---

## Responsive Design

### Mobile (< 768px)

- Form inputs full width
- Question cards full width
- Stack buttons vertically
- Reduce font sizes

### Tablet (768px - 1024px)

- Max-width container: 2xl (672px)
- Comfortable spacing
- Side-by-side buttons

### Desktop (> 1024px)

- Max-width container: 4xl (896px)
- Optimal reading width
- Horizontal button layout

---

## Rich Text Support

### HTML Rendering

- Sử dụng `dangerouslySetInnerHTML` cho:
  - Questions
  - MCQ options
  - Correct answers trong review
- Áp dụng `prose prose-sm max-w-none` classes
- Tương thích với Tiptap editor output

### HTML Stripping (Written Answer)

- Function `stripHtml()` xóa tags: `html.replace(/<[^>]*>/g, '')`
- Normalize: lowercase + trim
- So sánh case-insensitive

---

## Performance Considerations

### Optimization Techniques

1. **Form State**: react-hook-form giảm re-renders
2. **Shuffle Algorithm**: Fisher-Yates O(n) complexity
3. **Memoization**: Có thể thêm useMemo cho `isAnswerCorrect`
4. **Lazy Loading**: Chỉ render phase hiện tại

### Best Practices

- Validate config trước khi generate questions
- Clear form state khi restart
- Cleanup effect on unmount
- Error handling cho API calls

---

## Future Enhancements

### 1. Time Limit

- Countdown timer
- Auto-submit khi hết giờ
- Time pressure mode

### 2. Difficulty Modes

- Easy: Chỉ MCQ, 4 options dễ
- Medium: Mix 2 loại
- Hard: Tất cả 3 loại, complex questions

### 3. Save Results

- Lưu lịch sử bài làm vào backend
- Track progress theo thời gian
- Analytics: Thẻ nào hay sai

### 4. Question Bank

- Tạo nhiều bài test khác nhau
- Export/Import questions
- Share test với bạn bè

### 5. Adaptive Testing

- Dựa vào performance điều chỉnh độ khó
- Focus vào thẻ yếu
- Spaced repetition integration

---

## Troubleshooting

### Issue: Không tạo được câu hỏi

**Nguyên nhân**: Không chọn loại câu hỏi
**Giải pháp**: Kiểm tra ít nhất 1 checkbox được check

### Issue: MCQ chỉ có 1-2 đáp án

**Nguyên nhân**: Deck có ít hơn 4 thẻ
**Giải pháp**: Thêm thẻ hoặc điều chỉnh logic generateMCQ

### Issue: True/False luôn đúng

**Nguyên nhân**: Deck chỉ có 1 thẻ
**Giải pháp**: Fallback logic trong generateTrueFalse

### Issue: HTML không hiển thị

**Nguyên nhân**: Thiếu dangerouslySetInnerHTML
**Giải pháp**: Kiểm tra tất cả nơi render content

---

## Code Files

### Core Files

- `web/lib/testUtils.ts` - Logic tạo câu hỏi và chấm điểm
- `web/app/decks/[deckId]/test/page.tsx` - Test page component

### Dependencies

- `react-hook-form` - Form management
- `@/components/ui/*` - Shadcn components
- `@/lib/api-client` - API communication
- `sonner` - Toast notifications

### Related Files

- `web/types/card.ts` - Card interface
- `web/lib/htmlUtils.ts` - HTML stripping utility (reused)
