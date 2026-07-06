package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.inquiry.domain.entity.CustomFilter;
import com.ttam.cs.feature.inquiry.repository.CustomFilterRepository;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
public class DeleteCustomFilterUseCase {

    private final CustomFilterRepository customFilterRepository;

    @Transactional
    public Result execute(String remoteUser, Long id) {
        if (!StringUtils.hasText(remoteUser)) {
            return Result.BAD_REQUEST;
        }
        Optional<CustomFilter> filterOpt = customFilterRepository.findByOperatorIdAndId(remoteUser.trim(), id);
        if (filterOpt.isEmpty()) {
            return Result.NOT_FOUND;
        }
        customFilterRepository.delete(filterOpt.get());
        return Result.DELETED;
    }

    public enum Result {
        DELETED,
        NOT_FOUND,
        BAD_REQUEST
    }
}
