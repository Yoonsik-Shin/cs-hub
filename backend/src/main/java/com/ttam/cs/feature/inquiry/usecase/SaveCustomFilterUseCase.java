package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.inquiry.domain.entity.CustomFilter;
import com.ttam.cs.feature.inquiry.repository.CustomFilterRepository;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
public class SaveCustomFilterUseCase {

    private final CustomFilterRepository customFilterRepository;

    @Transactional
    public Optional<CustomFilter> execute(String remoteUser, String rawName, Map<String, Object> filterData) {
        if (!StringUtils.hasText(remoteUser) || !StringUtils.hasText(rawName) || filterData == null) {
            return Optional.empty();
        }

        String operatorId = remoteUser.trim();
        String name = rawName.trim();

        Optional<CustomFilter> existing = customFilterRepository.findByOperatorIdAndName(operatorId, name);
        if (existing.isPresent()) {
            CustomFilter filter = existing.get();
            filter.updateFilterData(filterData);
            return Optional.of(customFilterRepository.save(filter));
        }
        return Optional.of(customFilterRepository.save(CustomFilter.create(operatorId, name, filterData)));
    }
}
