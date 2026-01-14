/**
 * Cloudinary Upload Helper
 * Client-side upload sử dụng unsigned preset
 */

interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  [key: string]: any;
}

/**
 * Upload ảnh lên Cloudinary
 *
 * @param file File ảnh cần upload
 * @returns URL của ảnh đã upload
 * @throws Error nếu upload thất bại
 */
export async function uploadImageToCloudinary(file: File): Promise<string> {
  // Lấy config từ environment variables
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Missing Cloudinary configuration. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env.local"
    );
  }

  // Validate file type
  const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!validTypes.includes(file.type)) {
    throw new Error("Chỉ hỗ trợ file ảnh (JPEG, PNG, GIF, WebP)");
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error("Kích thước file không được vượt quá 5MB");
  }

  // Tạo FormData
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", "flashcards"); // Tùy chọn: Lưu vào folder

  try {
    // Upload lên Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Upload thất bại");
    }

    const data: CloudinaryUploadResponse = await response.json();

    // Trả về secure_url (HTTPS)
    return data.secure_url;
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    throw new Error(error.message || "Không thể upload ảnh. Vui lòng thử lại.");
  }
}

/**
 * Validate file trước khi upload
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Chỉ hỗ trợ file ảnh (JPEG, PNG, GIF, WebP)",
    };
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: "Kích thước file không được vượt quá 5MB",
    };
  }

  return { valid: true };
}
