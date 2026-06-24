package com.ttam.cs.infra.webhooks.dto.response;

import java.util.List;
import java.util.Map;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record KakaoChatbotSkillResponse(
        String version,
        Template template) {
    public KakaoChatbotSkillResponse {
        if (version == null) {
            version = "2.0";
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Template(
            List<Map<String, Object>> outputs,
            List<QuickReply> quickReplies) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record QuickReply(
            String label,
            String action,
            String messageText,
            String blockId,
            Map<String, Object> extra) {
    }

    /**
     * Factory method to build response from outputs list.
     */
    public static KakaoChatbotSkillResponse of(List<Map<String, Object>> outputs) {
        Template template = new Template(outputs, null);
        return new KakaoChatbotSkillResponse("2.0", template);
    }

    /**
     * Helper method to create a simple text output.
     */
    public static Map<String, Object> simpleTextOutput(String text) {
        return Map.of("simpleText", Map.of("text", text));
    }

    /**
     * Helper method to create a text card output with a web link button.
     */
    public static Map<String, Object> textCardOutput(String text, String buttonLabel, String webLinkUrl) {
        Map<String, Object> buttonMap = Map.of(
                "action", "webLink",
                "label", buttonLabel,
                "webLinkUrl", webLinkUrl
        );
        return Map.of(
                "textCard", Map.of(
                        "text", text,
                        "buttons", List.of(buttonMap)
                )
        );
    }
}
