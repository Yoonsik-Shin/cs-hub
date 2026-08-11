package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.common.util.EmailAddressUtils;
import com.ttam.cs.feature.auth.repository.AdminMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AdminEmailSenderPolicy {

    private final AdminMemberRepository adminMemberRepository;

    public boolean isAdmin(String from) {
        String emailAddress = EmailAddressUtils.extractEmailAddress(from);
        return emailAddress != null
                && !emailAddress.isBlank()
                && adminMemberRepository.existsByEmail(emailAddress);
    }
}
