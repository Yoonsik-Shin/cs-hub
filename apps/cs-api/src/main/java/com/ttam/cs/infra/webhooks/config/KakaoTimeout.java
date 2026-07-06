package com.ttam.cs.infra.webhooks.config;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * [Custom Annotation]
 * Enforces a timeout on Kakao chatbot skill webhook handlers.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface KakaoTimeout {
    /**
     * Timeout value in milliseconds. Default is 4500 ms (4.5 seconds).
     */
    long value() default 4500;
}
