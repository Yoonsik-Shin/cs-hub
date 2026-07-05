package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.inquiry.api.http.v1.dto.response.InquiryWorkLogResponse;
import com.ttam.cs.feature.inquiry.repository.InquiryWorkLogRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class GetInquiryWorkLogsUseCase {

    private final InquiryWorkLogRepository workLogRepository;

    @Transactional(readOnly = true)
    public List<InquiryWorkLogResponse> execute(UUID inquiryId) {
        return workLogRepository.findByInquiryIdOrderByCreatedAtDesc(inquiryId).stream()
                .map(InquiryWorkLogResponse::new)
                .toList();
    }
}
