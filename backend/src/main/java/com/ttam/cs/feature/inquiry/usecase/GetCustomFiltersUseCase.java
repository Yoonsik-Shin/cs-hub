package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.inquiry.domain.entity.CustomFilter;
import com.ttam.cs.feature.inquiry.repository.CustomFilterRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
public class GetCustomFiltersUseCase {

    private final CustomFilterRepository customFilterRepository;

    @Transactional(readOnly = true)
    public List<CustomFilter> execute(String remoteUser) {
        if (!StringUtils.hasText(remoteUser)) {
            return List.of();
        }
        return customFilterRepository.findByOperatorIdOrderByIdDesc(remoteUser.trim());
    }
}
