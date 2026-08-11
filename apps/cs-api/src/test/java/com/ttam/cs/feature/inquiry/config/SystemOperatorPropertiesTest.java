package com.ttam.cs.feature.inquiry.config;

import com.ttam.cs.feature.inquiry.domain.vo.OperatorInfo;
import com.ttam.cs.feature.inquiry.usecase.SystemOperatorProvider;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class SystemOperatorPropertiesTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(InquiryAutomationConfig.class)
            .withPropertyValues(
                    "cs.inquiry.system-operator.id=mail-automation",
                    "cs.inquiry.system-operator.nickname=메일 자동화",
                    "cs.inquiry.system-operator.email=automation@example.com"
            );

    @Test
    void configuredIdentityIsExposedThroughUseCasePort() {
        contextRunner.run(context -> {
            SystemOperatorProvider provider = context.getBean(SystemOperatorProvider.class);

            assertThat(provider.getOperator()).isEqualTo(new OperatorInfo(
                    "mail-automation",
                    "메일 자동화",
                    "automation@example.com"
            ));
        });
    }
}
