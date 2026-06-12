package com.ttam.cs.webhooks.handler.skill;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

import com.ttam.cs.webhooks.dto.request.KakaoChatbotSkillRequest;
import com.ttam.cs.webhooks.dto.response.KakaoChatbotSkillResponse;
import com.ttam.cs.webhooks.handler.KakaoChatbotSkillHandler;

@Component
@RequiredArgsConstructor
@Slf4j
public class CreateInquirySkillHandler implements KakaoChatbotSkillHandler {

    public static final String SKILL_NAME = "createInquiry";

    @Override
    public String getSkillName() {
        return SKILL_NAME;
    }

    @Override
    public KakaoChatbotSkillResponse execute(KakaoChatbotSkillRequest payload) {
        String userCode = "";
        if (payload.action() != null && payload.action().params() != null) {
            Object paramVal = payload.action().params().get("user_code");
            if (paramVal == null) {
                paramVal = payload.action().params().get("userCode");
            }
            if (paramVal != null) {
                userCode = paramVal.toString();
            }
        }

        log.info("📥 [CreateInquirySkillHandler] Received skill request. UserCode parameter: {}", userCode);

        String finalUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdYxWpjf6jhG6xM3kl0WY4gMgvSCIbzedp7q6n8IPWw_AvLdA/viewform?usp=pp_url&entry.419238142="
                + userCode;

        return KakaoChatbotSkillResponse.of(List.of(
                KakaoChatbotSkillResponse.textCardOutput(
                        "유저코드는 정상적으로 확인됐어요!\n아래 문의하기 버튼을 클릭하여 자세한 문의사항을 작성해주세요!",
                        "오류 접수하기",
                        finalUrl
                )
        ));
    }
}
