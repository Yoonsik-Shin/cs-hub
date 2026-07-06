package com.ttam.cs.infra.webhooks.exception;

/**
 * Exception thrown when a requested Kakao chatbot skill name does not match any
 * registered handler.
 */
public class NoSuchSkillHandlerException extends RuntimeException {
    public NoSuchSkillHandlerException(String message) {
        super(message);
    }
}
