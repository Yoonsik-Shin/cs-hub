package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.inquiry.domain.CustomFilter;
import com.ttam.cs.feature.inquiry.repository.CustomFilterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class CustomFilterUseCase {
    private final CustomFilterRepository customFilterRepository;

    @Transactional(readOnly = true)
    public List<CustomFilter> getCustomFilters(String remoteUser) {
        if (!StringUtils.hasText(remoteUser)) {
            return List.of();
        }
        return customFilterRepository.findByOperatorIdOrderByIdDesc(remoteUser.trim());
    }

    @Transactional
    public Optional<CustomFilter> saveCustomFilter(String remoteUser, String rawName, Map<String, Object> filterData) {
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

    @Transactional
    public DeleteResult deleteCustomFilter(String remoteUser, Long id) {
        if (!StringUtils.hasText(remoteUser)) {
            return DeleteResult.BAD_REQUEST;
        }
        Optional<CustomFilter> filterOpt = customFilterRepository.findByOperatorIdAndId(remoteUser.trim(), id);
        if (filterOpt.isEmpty()) {
            return DeleteResult.NOT_FOUND;
        }
        customFilterRepository.delete(filterOpt.get());
        return DeleteResult.DELETED;
    }

    public enum DeleteResult {
        DELETED,
        NOT_FOUND,
        BAD_REQUEST
    }
}
