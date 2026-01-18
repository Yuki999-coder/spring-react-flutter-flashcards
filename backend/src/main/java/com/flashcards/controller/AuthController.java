package com.flashcards.controller;

import com.flashcards.dto.request.LoginRequest;
import com.flashcards.dto.request.RegisterRequest;
import com.flashcards.dto.response.AuthResponse;
import com.flashcards.model.entity.User;
import com.flashcards.repository.UserRepository;
import com.flashcards.security.JwtUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

/**
 * Authentication Controller
 * Handles user registration and login with JWT tokens
 * Base URL: /api/v1/auth
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "API xác thực người dùng (Đăng ký, Đăng nhập)")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    /**
     * Register a new user
     * POST /api/v1/auth/register
     *
     * @param request Registration data (email, password)
     * @return JWT token and user info
     */
    @Operation(summary = "Đăng ký tài khoản mới", description = "Tạo tài khoản mới và nhận JWT token")
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        log.info("POST /api/v1/auth/register - email: {}", request.getEmail());

        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            log.warn("Registration failed: Email already exists: {}", request.getEmail());
            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(AuthResponse.withMessage("Email already exists"));
        }

        // Create new user with BCrypt hashed password
        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .build();

        User savedUser = userRepository.save(user);
        log.info("User registered successfully: id={}, email={}", savedUser.getId(), savedUser.getEmail());

        // Generate JWT token
        String token = jwtUtils.generateToken(savedUser.getEmail());

        AuthResponse response = AuthResponse.of(token, savedUser.getId().toString(), savedUser.getEmail());
        response.setMessage("User registered successfully");

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Login user
     * POST /api/v1/auth/login
     *
     * @param request Login credentials (email, password)
     * @return JWT token and user info
     */
    @Operation(summary = "Đăng nhập hệ thống", description = "Xác thực người dùng và nhận JWT token")
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        log.info("POST /api/v1/auth/login - email: {}", request.getEmail());

        try {
            // Authenticate user
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getEmail(),
                            request.getPassword()
                    )
            );

            // Set authentication in SecurityContext
            SecurityContextHolder.getContext().setAuthentication(authentication);

            // Get user details
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            
            // Find user entity
            User user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Generate JWT token
            String token = jwtUtils.generateToken(userDetails);

            log.info("User logged in successfully: id={}, email={}", user.getId(), user.getEmail());

            AuthResponse response = AuthResponse.of(token, user.getId().toString(), user.getEmail());
            response.setMessage("Login successful");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.warn("Login failed for email: {} - {}", request.getEmail(), e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(AuthResponse.withMessage("Invalid email or password"));
        }
    }

    /**
     * Validate token (optional endpoint for frontend to check token validity)
     * GET /api/v1/auth/validate
     *
     * @return Current user info if token is valid
     */
    @Operation(summary = "Kiểm tra token hợp lệ", description = "Xác minh token JWT hiện tại có hợp lệ không")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/validate")
    public ResponseEntity<AuthResponse> validateToken() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.isAuthenticated()) {
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            User user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            AuthResponse response = AuthResponse.builder()
                    .userId(user.getId().toString())
                    .email(user.getEmail())
                    .message("Token is valid")
                    .build();

            return ResponseEntity.ok(response);
        }

        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(AuthResponse.withMessage("Invalid or expired token"));
    }

    /**
     * Get current user info
     * GET /api/v1/auth/me
     *
     * @return Current user info
     */
    @Operation(summary = "Lấy thông tin người dùng hiện tại", description = "Trả về thông tin của người dùng đang đăng nhập")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/me")
    public ResponseEntity<AuthResponse> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.isAuthenticated()) {
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            User user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            AuthResponse response = AuthResponse.builder()
                    .userId(user.getId().toString())
                    .email(user.getEmail())
                    .build();

            return ResponseEntity.ok(response);
        }

        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(AuthResponse.withMessage("Not authenticated"));
    }
}
