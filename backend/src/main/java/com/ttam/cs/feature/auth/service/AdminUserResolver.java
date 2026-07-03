package com.ttam.cs.feature.auth.service;

import com.ttam.cs.feature.auth.domain.AdminMember;
import com.ttam.cs.feature.auth.domain.AdminUser;
import com.ttam.cs.feature.auth.repo.AdminMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminUserResolver {

    private final AdminMemberRepository adminMemberRepository;

    public AdminUser resolve(String remoteUser) {
        if (remoteUser == null || remoteUser.isBlank()) {
            return AdminUser.unknown(null);
        }

        String username = remoteUser.trim();
        return adminMemberRepository.findById(username)
                .map(this::toAdminUser)
                .orElseGet(() -> AdminUser.unknown(username));
    }

    private AdminUser toAdminUser(AdminMember member) {
        return new AdminUser(member.getUsername(), member.getNickname(), member.getEmail(), member.getRole());
    }
}
