package com.ttam.cs.feature.inquiry.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.NamedType;
import com.ttam.cs.feature.inquiry.domain.vo.ChannelMetadata;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AssignableTypeFilter;

/**
 * {@code ChannelMetadata} 구현체들을 클래스패스에서 스캔해 각 {@code ObjectMapper}에 다형성 서브타입으로
 * 등록한다. Spring 빈({@link IntegrationJacksonConfig})과 Spring 컨텍스트 없이 동작하는 CLI 도구
 * ({@code PiiEncryptionMigrationTool})가 이 로직을 공유하기 위해 별도 유틸리티로 분리했다.
 */
public final class ChannelMetadataSubtypeRegistrar {

    private ChannelMetadataSubtypeRegistrar() {
    }

    public static void registerAll(ObjectMapper... mappers) {
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

                    for (ObjectMapper mapper : mappers) {
                        mapper.registerSubtypes(new NamedType(clazz, name));
                    }
                    @SuppressWarnings("unchecked")
                    Class<? extends ChannelMetadata> metadataClass = (Class<? extends ChannelMetadata>) clazz;
                    ChannelMetadata.register(name, metadataClass);
                });
    }
}
