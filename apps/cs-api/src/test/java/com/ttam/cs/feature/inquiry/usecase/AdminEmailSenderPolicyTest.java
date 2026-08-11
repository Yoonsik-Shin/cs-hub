package com.ttam.cs.feature.inquiry.usecase;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ttam.cs.feature.auth.repository.AdminMemberRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AdminEmailSenderPolicyTest {

    @Mock
    private AdminMemberRepository adminMemberRepository;

    @Test
    void identifiesAdminFromDisplayNameHeader() {
        AdminEmailSenderPolicy policy = new AdminEmailSenderPolicy(adminMemberRepository);
        when(adminMemberRepository.existsByEmail("cshub@ttam.ai")).thenReturn(true);

        assertTrue(policy.isAdmin("CS Hub <cshub@ttam.ai>"));
        verify(adminMemberRepository).existsByEmail("cshub@ttam.ai");
    }

    @Test
    void returnsFalseForCustomerSender() {
        AdminEmailSenderPolicy policy = new AdminEmailSenderPolicy(adminMemberRepository);
        when(adminMemberRepository.existsByEmail("customer@test.com")).thenReturn(false);

        assertFalse(policy.isAdmin("customer@test.com"));
    }

    @Test
    void skipsLookupWhenSenderIsBlank() {
        AdminEmailSenderPolicy policy = new AdminEmailSenderPolicy(adminMemberRepository);

        assertFalse(policy.isAdmin("  "));
        verify(adminMemberRepository, never()).existsByEmail(org.mockito.ArgumentMatchers.any());
    }
}
