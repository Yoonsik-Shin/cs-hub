package com.ttam.cs.infra.webhooks.dto.request;

import java.util.Map;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@JsonIgnoreProperties(ignoreUnknown = true)
public record KakaoChatbotSkillRequest(
                UserRequest userRequest,
                Bot bot,
                @NotNull @Valid Action action) {
        @JsonIgnoreProperties(ignoreUnknown = true)
        public record UserRequest(
                        String utterance,
                        User user) {
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        public record User(
                        String id,
                        String type,
                        Map<String, Object> properties) {
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        public record Bot(
                        String id,
                        String name) {
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        public record Action(
                        String id,
                        @NotBlank String name,
                        Map<String, Object> params,
                        Map<String, Object> detailParams,
                        Map<String, Object> clientExtra) {
        }
}
