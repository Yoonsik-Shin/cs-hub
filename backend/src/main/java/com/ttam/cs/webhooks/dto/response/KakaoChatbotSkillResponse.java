package com.ttam.cs.webhooks.dto.response;

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
     * 여러 답변 리스트를 받아 응답 객체를 구성하는 팩토리 메서드
     */
    public static KakaoChatbotSkillResponse of(List<Map<String, Object>> outputs) {
        Template template = new Template(outputs, null);
        return new KakaoChatbotSkillResponse("2.0", template);
    }

    /**
     * 단순 텍스트 출력을 생성하는 헬퍼 메서드
     */
    public static Map<String, Object> simpleTextOutput(String text) {
        return Map.of("simpleText", Map.of("text", text));
    }

    /**
     * 버튼이 달린 텍스트 카드 출력을 생성하는 헬퍼 메서드
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
