/**
 * Strip HTML tags from a string and return plain text
 * Safe to use in browser environment only (uses DOM APIs)
 *
 * @param html HTML string (e.g., "<p><strong style='color:red'>Apple</strong></p>")
 * @returns Plain text without HTML tags (e.g., "Apple")
 *
 * @example
 * stripHtml("<p><strong>Hello</strong></p>") // "Hello"
 * stripHtml("<span style='color:red'>Red Text</span>") // "Red Text"
 * stripHtml("Plain text") // "Plain text"
 */
export function stripHtml(html: string): string {
  if (!html) return "";

  // Check if we're in browser environment
  if (typeof window === "undefined") {
    // Fallback for SSR: simple regex-based stripping
    return html
      .replace(/<[^>]*>/g, "") // Remove all HTML tags
      .replace(/&nbsp;/g, " ") // Replace &nbsp; with space
      .replace(/&amp;/g, "&") // Replace &amp; with &
      .replace(/&lt;/g, "<") // Replace &lt; with <
      .replace(/&gt;/g, ">") // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .trim();
  }

  // Browser environment: Use DOMParser for proper HTML parsing
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const text = doc.body.textContent || "";
    return text.trim();
  } catch (error) {
    // Fallback if DOMParser fails
    const textarea = document.createElement("textarea");
    textarea.innerHTML = html.replace(/<[^>]*>/g, "");
    return textarea.value.trim();
  }
}

/**
 * Check if a string contains HTML tags
 * @param str String to check
 * @returns true if contains HTML tags
 */
export function hasHtmlTags(str: string): boolean {
  return /<[^>]*>/g.test(str);
}
