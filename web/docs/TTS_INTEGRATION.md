# Text-to-Speech (TTS) Integration

## 📖 Tổng quan

Tích hợp tính năng Text-to-Speech vào ứng dụng Flashcard để hỗ trợ học phát âm tiếng Anh.

## ✨ Tính năng

### 1. **Custom Hook: `use-tts.ts`**

- ✅ Sử dụng Web Speech API (native browser API)
- ✅ Tự động strip HTML tags trước khi đọc
- ✅ Ưu tiên giọng English (US) → English (UK) → English (\*)
- ✅ Auto-cancel speech cũ khi click liên tục
- ✅ Fail-safe: Toast warning nếu browser không hỗ trợ
- ✅ Configurable speech rate (0.9x - chậm hơn một chút để học)

### 2. **Review Mode (Flashcard.tsx)**

- ✅ Nút loa ở **Term** (mặt trước thẻ)
- ✅ Nút loa ở **Definition** (mặt sau thẻ)
- ✅ Click nút loa không làm lật thẻ (stopPropagation)
- ✅ Hover effect: Nút sáng lên khi hover

### 3. **Learn Mode (page.tsx)**

- ✅ Nút loa bên cạnh **Question** (câu hỏi)
- ✅ Hoạt động cả 2 mode: MCQ và Written
- ✅ Giúp người dùng nghe lại phát âm để làm bài

## 🔧 Cách sử dụng

### Import Hook

```tsx
import { useTTS } from "@/hooks/use-tts";

function MyComponent() {
  const { speak, stop, isSupported, isSpeaking } = useTTS();

  // Speak HTML content (auto-strips tags)
  const handleSpeak = () => {
    speak("<p><strong>Apple</strong></p>", "en-US");
  };

  return <button onClick={handleSpeak}>🔊 Speak</button>;
}
```

### API Reference

#### `useTTS()`

Returns:

- `speak(htmlText: string, lang?: string)` - Phát âm text (auto-strip HTML)
- `stop()` - Dừng phát âm hiện tại
- `isSupported: boolean` - Kiểm tra browser có hỗ trợ không
- `isSpeaking: boolean` - Đang phát âm hay không

## 🎨 UI/UX

### Hover States

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => speak(text)}
  className="hover:bg-primary/10 hover:text-primary transition-all"
  title="Nghe phát âm"
>
  <Volume2 className="h-5 w-5" />
</Button>
```

### Icon Positioning

- **Flashcard**: Icon ở bên phải của text (flex layout)
- **Learn Mode**: Icon ở bên phải của question

## 🛡️ Error Handling

### Browser không hỗ trợ

```tsx
if (!isSupported) {
  toast.error("Trình duyệt của bạn không hỗ trợ Text-to-Speech");
  return;
}
```

### Speech synthesis error

```tsx
utterance.onerror = (event) => {
  if (event.error !== "interrupted" && event.error !== "cancelled") {
    toast.error("Lỗi khi phát âm thanh");
  }
};
```

## 🧪 Testing

### Test Cases

1. **HTML Stripping**

   - Input: `<p><strong style="color:red">Apple</strong></p>`
   - Output: "Apple" (spoken)

2. **Multiple Clicks**

   - Click nút loa nhiều lần → Cancel speech cũ, phát speech mới

3. **Card Flip Prevention**

   - Click nút loa trên Flashcard → Không lật thẻ

4. **Browser Support**
   - Chrome/Edge: ✅ Fully supported
   - Firefox: ✅ Supported
   - Safari: ✅ Supported
   - Old browsers: ⚠️ Graceful degradation (toast warning)

## 📱 Browser Compatibility

| Browser     | Support | Notes         |
| ----------- | ------- | ------------- |
| Chrome 33+  | ✅      | Full support  |
| Edge 14+    | ✅      | Full support  |
| Firefox 49+ | ✅      | Full support  |
| Safari 7+   | ✅      | Full support  |
| Opera 21+   | ✅      | Full support  |
| IE          | ❌      | Not supported |

## 🔊 Speech Parameters

```typescript
utterance.rate = 0.9; // Slower for learning (0.1 - 10)
utterance.pitch = 1.0; // Normal pitch (0 - 2)
utterance.volume = 1.0; // Full volume (0 - 1)
utterance.lang = "en-US"; // English (US)
```

## 🎯 Use Cases

1. **Học phát âm**: Nghe cách đọc từ/câu tiếng Anh
2. **Kiểm tra hiểu**: Nghe lại question trong Learn Mode
3. **Ôn tập**: Nghe term và definition trong Review Mode
4. **Accessibility**: Hỗ trợ người khiếm thị

## 🚀 Future Enhancements

- [ ] Thêm tùy chọn chọn giọng đọc (male/female)
- [ ] Điều chỉnh tốc độ đọc (speed control)
- [ ] Highlight từ đang được đọc
- [ ] Tự động đọc khi lật thẻ
- [ ] Lưu preference vào localStorage

## 📝 Notes

- **HTML Content**: Hook tự động strip HTML, không cần xử lý thủ công
- **Performance**: Speech synthesis chạy trên main thread, không block UI
- **Memory**: Auto-cancel speech cũ để tránh memory leak
- **Accessibility**: Sử dụng semantic HTML và ARIA labels
