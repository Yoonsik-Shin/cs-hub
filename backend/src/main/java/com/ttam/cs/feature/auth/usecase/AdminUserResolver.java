package com.ttam.cs.feature.auth.usecase;

import com.ttam.cs.feature.auth.domain.entity.AdminMember;
import com.ttam.cs.feature.auth.repository.AdminMemberRepository;
import com.ttam.cs.feature.auth.usecase.dto.CurrentAdminUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AdminUserResolver {

    private final AdminMemberRepository adminMemberRepository;

    public CurrentAdminUser resolve(String remoteUser) {
        if (remoteUser == null || remoteUser.isBlank()) {
            return CurrentAdminUser.unknown(null);
        }

        String username = remoteUser.trim();
        return adminMemberRepository.findById(username)
                .map(this::toCurrentAdminUser)
                .orElseGet(() -> CurrentAdminUser.unknown(username));
    }

    private CurrentAdminUser toCurrentAdminUser(AdminMember member) {
        return new CurrentAdminUser(member.getUsername(), member.getNickname(), member.getEmail(), member.getRole());
    }
}
