package com.ttam.cs.infra.webhooks.handler.kakao;

import com.ttam.cs.infra.webhooks.dto.request.KakaoChatbotSkillRequest;
import com.ttam.cs.infra.webhooks.dto.response.KakaoChatbotSkillResponse;

public interface KakaoChatbotSkillHandler {
    String getSkillName();

    KakaoChatbotSkillResponse execute(KakaoChatbotSkillRequest payload);
}
