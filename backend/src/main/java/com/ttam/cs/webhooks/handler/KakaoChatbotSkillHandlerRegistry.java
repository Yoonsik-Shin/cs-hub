package com.ttam.cs.webhooks.handler;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.ttam.cs.webhooks.exception.NoSuchSkillHandlerException;

@Component
public class KakaoChatbotSkillHandlerRegistry {

    private final Map<String, KakaoChatbotSkillHandler> registry;

    public KakaoChatbotSkillHandlerRegistry(List<KakaoChatbotSkillHandler> handlers) {
        this.registry = handlers.stream()
                .collect(Collectors.toMap(
                        KakaoChatbotSkillHandler::getSkillName,
                        Function.identity()));
    }

    public KakaoChatbotSkillHandler get(String skillName) {
        KakaoChatbotSkillHandler handler = registry.get(skillName);
        if (handler == null) {
            throw new NoSuchSkillHandlerException("No registered skill handler for name: " + skillName);
        }
        return handler;
    }
}
