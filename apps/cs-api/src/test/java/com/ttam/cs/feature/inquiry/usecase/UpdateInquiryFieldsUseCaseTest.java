package com.ttam.cs.feature.inquiry.usecase;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ttam.cs.feature.inquiry.api.http.v1.dto.request.UpdateInquiryFieldsRequest;
import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.vo.OperatorInfo;
import com.ttam.cs.feature.inquiry.exception.InvalidInquiryRequestException;
import com.ttam.cs.feature.inquiry.repository.CustomerInquiryRepository;
import com.ttam.cs.feature.inquiry.repository.InquiryWorkLogRepository;
import com.ttam.cs.infra.storage.StorageService;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UpdateInquiryFieldsUseCaseTest {

    private static final OperatorInfo OPERATOR = new OperatorInfo("operator", "담당자", "operator@example.com");

    @Mock
    private CustomerInquiryRepository inquiryRepository;
    @Mock
    private InquiryWorkLogRepository workLogRepository;
    @Mock
    private StorageService storageService;
    @Mock
    private CustomerInquiry inquiry;

    private UpdateInquiryFieldsUseCase useCase;
    private UUID inquiryId;

    @BeforeEach
    void setUp() {
        useCase = new UpdateInquiryFieldsUseCase(
                inquiryRepository,
                workLogRepository,
                storageService,
                new ObjectMapper());
        inquiryId = UUID.randomUUID();
        when(inquiryRepository.findById(inquiryId)).thenReturn(Optional.of(inquiry));
        when(inquiry.getImageUrls()).thenReturn(List.of("old.png"));
        when(storageService.extractObjectKey("new.png")).thenReturn("new.png");
    }

    @AfterEach
    void tearDown() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void rejectsImageChangesWithoutOperatorReasonBeforeMutation() {
        UpdateInquiryFieldsRequest request = requestWithImages(Map.of());

        assertThrows(InvalidInquiryRequestException.class, () -> useCase.execute(inquiryId, request, "127.0.0.1"));

        verify(inquiry, never()).updateImageUrls(any());
        verify(storageService, never()).deleteObject(any());
        verify(inquiryRepository, never()).save(any());
        verify(workLogRepository, never()).save(any());
    }

    @Test
    void deletesRemovedImagesOnlyAfterTransactionCommit() {
        TransactionSynchronizationManager.initSynchronization();

        useCase.execute(inquiryId, requestWithImages(Map.of("imageUrls", "고객 요청으로 교체")), "127.0.0.1");

        verify(inquiry).updateImageUrls(List.of("new.png"));
        verify(storageService, never()).deleteObject("old.png");
        TransactionSynchronizationManager.getSynchronizations().forEach(synchronization -> synchronization.afterCommit());
        verify(storageService).deleteObject("old.png");
    }

    private UpdateInquiryFieldsRequest requestWithImages(Map<String, String> reasons) {
        return new UpdateInquiryFieldsRequest(
                OPERATOR,
                null,
                null,
                null,
                null,
                List.of("new.png"),
                null,
                reasons);
    }
}
