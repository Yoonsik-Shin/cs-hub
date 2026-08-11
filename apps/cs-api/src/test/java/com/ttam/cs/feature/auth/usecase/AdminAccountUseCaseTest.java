package com.ttam.cs.feature.auth.usecase;

import com.ttam.cs.common.exception.BusinessException;
import com.ttam.cs.common.exception.ErrorCode;
import com.ttam.cs.feature.auth.domain.entity.AdminMember;
import com.ttam.cs.feature.auth.repository.AdminMemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminAccountUseCaseTest {

    @Mock
    private AdminMemberRepository adminMemberRepository;

    @Mock
    private HtpasswdUseCase htpasswdUseCase;

    private AdminAccountUseCase useCase;

    @BeforeEach
    void setUp() {
        useCase = new AdminAccountUseCase(adminMemberRepository, htpasswdUseCase);
    }

    @Test
    void flushesDatabaseBeforeWritingHtpasswd() {
        useCase.create("operator", "password", "운영자", "operator@example.com", "OPERATOR");

        InOrder order = inOrder(adminMemberRepository, htpasswdUseCase);
        order.verify(adminMemberRepository).saveAndFlush(any(AdminMember.class));
        order.verify(htpasswdUseCase).saveOrUpdateUser("operator", "password");
    }

    @Test
    void propagatesHtpasswdFailureSoTransactionCanRollBack() {
        BusinessException failure = new BusinessException(ErrorCode.HTPASSWD_IO_ERROR);
        org.mockito.Mockito.doThrow(failure)
                .when(htpasswdUseCase).saveOrUpdateUser("operator", "password");

        assertThrows(BusinessException.class,
                () -> useCase.create("operator", "password", "운영자", null, "OPERATOR"));
    }

    @Test
    void flushesDeletionBeforeRemovingHtpasswdEntry() {
        when(adminMemberRepository.existsById("operator")).thenReturn(true);

        useCase.delete("operator", "admin");

        InOrder order = inOrder(adminMemberRepository, htpasswdUseCase);
        order.verify(adminMemberRepository).deleteById("operator");
        order.verify(adminMemberRepository).flush();
        order.verify(htpasswdUseCase).deleteUser("operator");
    }

    @Test
    void rejectsDeletingCurrentAccountBeforeAnyWrite() {
        assertThrows(ResponseStatusException.class, () -> useCase.delete("operator", "operator"));

        verify(adminMemberRepository, never()).deleteById(any());
        verify(htpasswdUseCase, never()).deleteUser(any());
    }

    @Test
    void restoresPreviousHtpasswdEntryWhenTransactionRollsBack() {
        when(htpasswdUseCase.saveOrUpdateUser("operator", "password"))
                .thenReturn("operator:$2y$previous");
        TransactionSynchronizationManager.initSynchronization();
        try {
            useCase.create("operator", "password", "운영자", null, "OPERATOR");
            TransactionSynchronization synchronization = TransactionSynchronizationManager
                    .getSynchronizations()
                    .getFirst();

            synchronization.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);

            verify(htpasswdUseCase).restoreUserEntry("operator", "operator:$2y$previous");
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }
}
