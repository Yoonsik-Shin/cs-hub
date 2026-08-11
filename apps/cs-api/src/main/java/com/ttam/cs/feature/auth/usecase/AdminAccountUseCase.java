package com.ttam.cs.feature.auth.usecase;

import com.ttam.cs.feature.auth.domain.entity.AdminMember;
import com.ttam.cs.feature.auth.repository.AdminMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminAccountUseCase {

    static final String MASTER_USERNAME = "runday-cs-admin";

    private final AdminMemberRepository adminMemberRepository;
    private final HtpasswdUseCase htpasswdUseCase;

    @Transactional
    public void create(String username, String password, String nickname, String email, String role) {
        String normalizedUsername = username.trim();
        if (adminMemberRepository.existsById(normalizedUsername)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 존재하는 사용자 아이디입니다.");
        }

        AdminMember member = new AdminMember(normalizedUsername, nickname, email, role);
        adminMemberRepository.saveAndFlush(member);
        String previousEntry = htpasswdUseCase.saveOrUpdateUser(normalizedUsername, password);
        restoreHtpasswdOnRollback(normalizedUsername, previousEntry);
    }

    @Transactional
    public void delete(String username, String currentUsername) {
        String targetUsername = username.trim();

        if (targetUsername.equals(MASTER_USERNAME)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "마스터 관리자 계정은 삭제할 수 없습니다.");
        }
        if (currentUsername != null && targetUsername.equals(currentUsername.trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 로그인한 본인 계정은 삭제할 수 없습니다.");
        }
        if (!adminMemberRepository.existsById(targetUsername)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 계정을 찾을 수 없습니다.");
        }

        adminMemberRepository.deleteById(targetUsername);
        adminMemberRepository.flush();
        String previousEntry = htpasswdUseCase.deleteUser(targetUsername);
        restoreHtpasswdOnRollback(targetUsername, previousEntry);
    }

    private void restoreHtpasswdOnRollback(String username, String previousEntry) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_COMMITTED) {
                    return;
                }
                try {
                    htpasswdUseCase.restoreUserEntry(username, previousEntry);
                } catch (RuntimeException exception) {
                    log.error("Failed to restore htpasswd entry after transaction rollback: {}", username, exception);
                }
            }
        });
    }
}
