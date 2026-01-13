package com.flashcards.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Validator for HtmlNotBlank annotation
 * Strips HTML tags and checks if remaining text is not blank
 */
public class HtmlNotBlankValidator implements ConstraintValidator<HtmlNotBlank, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return false;
        }

        // Strip HTML tags and check if there's actual content
        String textContent = value.replaceAll("<[^>]*>", "").trim();
        return !textContent.isEmpty();
    }
}
