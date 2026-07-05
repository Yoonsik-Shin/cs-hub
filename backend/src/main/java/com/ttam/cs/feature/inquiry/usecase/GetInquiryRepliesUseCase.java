package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import com.ttam.cs.feature.inquiry.repository.CustomerInquiryRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class GetInquiryRepliesUseCase {

    private final CustomerInquiryRepository repository;

    @Transactional(readOnly = true)
    public List<CustomerInquiry> execute(UUID parentId) {
        return repository.findByParentIdOrderByTimestampAsc(parentId);
    }
}
