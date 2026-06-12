package com.ttam.cs.webhooks.handler;

import com.ttam.cs.webhooks.dto.request.KakaoChatbotSkillRequest;
import com.ttam.cs.webhooks.dto.response.KakaoChatbotSkillResponse;

public interface KakaoChatbotSkillHandler {
    String getSkillName();

    KakaoChatbotSkillResponse execute(KakaoChatbotSkillRequest payload);
}
