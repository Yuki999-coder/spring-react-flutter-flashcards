package com.flashcards.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

/**
 * Custom validation annotation for HTML content
 * Validates that HTML string has actual text content (not just empty tags)
 */
@Documented
@Constraint(validatedBy = HtmlNotBlankValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface HtmlNotBlank {
    String message() default "Content cannot be empty";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
