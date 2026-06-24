package com.ttam.cs.feature.inquiry.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.NamedType;
import com.ttam.cs.feature.inquiry.domain.ChannelMetadata;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.type.filter.AssignableTypeFilter;

@Configuration
@RequiredArgsConstructor
public class IntegrationJacksonConfig {

    private final ObjectMapper objectMapper;

    @PostConstruct
    public void registerChannelMetadataSubtypes() {
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AssignableTypeFilter(ChannelMetadata.class));

        scanner.findCandidateComponents("com.ttam.cs").stream()
                .map(BeanDefinition::getBeanClassName)
                .map(name -> {
                    try {
                        return Class.forName(name);
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(clazz -> clazz != null && !clazz.isInterface())
                .forEach(clazz -> {
                    // OCP 및 일관성 준수: 클래스명에서 직접 UPPERCASE_SNAKE_CASE(예: GOOGLE_SHEET) 타입명 추출
                    String name = clazz.getSimpleName().replace("Metadata", "")
                            .replaceAll("([a-z])([A-Z])", "$1_$2").toUpperCase();
                    
                    objectMapper.registerSubtypes(new NamedType(clazz, name));
                    ChannelMetadata.register(name, (Class<? extends ChannelMetadata>) clazz);
                });
    }
}
