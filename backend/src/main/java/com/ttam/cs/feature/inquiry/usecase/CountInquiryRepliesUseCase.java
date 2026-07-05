package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.inquiry.repository.CustomerInquiryRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class CountInquiryRepliesUseCase {

    private final CustomerInquiryRepository repository;

    @Transactional(readOnly = true)
    public Map<UUID, Long> execute(List<UUID> parentIds) {
        if (parentIds == null || parentIds.isEmpty()) {
            return Map.of();
        }
        List<Object[]> results = repository.countRepliesByParentIds(parentIds);
        Map<UUID, Long> countMap = new HashMap<>();
        for (Object[] row : results) {
            if (row[0] != null && row[1] != null) {
                countMap.put((UUID) row[0], ((Number) row[1]).longValue());
            }
        }
        return countMap;
    }
}
