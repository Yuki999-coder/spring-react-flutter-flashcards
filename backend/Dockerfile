# --- Giai đoạn 1: Build (Chế biến nguyên liệu) ---
# Dùng hình ảnh Maven có sẵn Java 17 để build code
FROM maven:3.9.6-eclipse-temurin-17 AS build

# Tạo thư mục làm việc
WORKDIR /app

# Copy toàn bộ code từ máy bạn vào trong Docker
COPY . .

# Chạy lệnh Maven để đóng gói code thành file .jar (Bỏ qua test cho nhanh)
RUN mvn clean package -DskipTests

# --- Giai đoạn 2: Run (Dọn món ăn ra bàn) ---
# Dùng Java 17 bản nhẹ (JRE) để chạy cho mượt
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Lấy file .jar đã nấu chín ở giai đoạn 1 bỏ sang đây
COPY --from=build /app/target/*.jar app.jar

# Mở cổng 8080
EXPOSE 8080

# Lệnh chạy ứng dụng khi khởi động
ENTRYPOINT ["java", "-jar", "app.jar"]