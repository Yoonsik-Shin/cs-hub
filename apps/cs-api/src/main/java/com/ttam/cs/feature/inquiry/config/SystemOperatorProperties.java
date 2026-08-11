package com.ttam.cs.feature.inquiry.config;

import com.ttam.cs.feature.inquiry.domain.vo.OperatorInfo;
import com.ttam.cs.feature.inquiry.usecase.SystemOperatorProvider;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "cs.inquiry.system-operator")
public class SystemOperatorProperties implements SystemOperatorProvider {

    @NotBlank
    private String id;

    @NotBlank
    private String nickname;

    private String email = "";

    @Override
    public OperatorInfo getOperator() {
        return new OperatorInfo(id, nickname, email);
    }
}
