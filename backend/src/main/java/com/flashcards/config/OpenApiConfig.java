package com.flashcards.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "Flashcards Learning API",
                version = "1.0.0",
                description = "REST API cho ứng dụng học thẻ ghi nhớ (Flashcards) sử dụng thuật toán SM-2 Spaced Repetition",
                contact = @Contact(
                        name = "Flashcards Team",
                        email = "support@flashcards.com"
                )
        ),
        servers = {
                @Server(url = "http://localhost:8080", description = "Development Server")
        }
)
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "Nhập JWT token để xác thực. Token có thể lấy từ endpoint /api/v1/auth/login hoặc /api/v1/auth/register"
)
public class OpenApiConfig {
    // Configuration chỉ cần annotations, không cần thêm code
}
