package com.ttam.cs.feature.auth.api.v1.controller;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.ttam.cs.feature.auth.domain.entity.AdminMember;
import com.ttam.cs.feature.auth.repository.AdminMemberRepository;
import com.ttam.cs.feature.auth.usecase.HtpasswdUseCase;
import com.ttam.cs.infra.security.AdminRole;
import com.ttam.cs.infra.security.RequireRoles;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;

@Tag(name = "Admin Account Management API", description = "관리자/운영자 계정 관리 API (최고 관리자 전용)")
@RestController
@RequestMapping("/api/v1/admin/accounts")
@RequiredArgsConstructor
public class AdminAccountController {

    private final AdminMemberRepository adminMemberRepository;
    private final HtpasswdUseCase htpasswdUseCase;

    @Operation(summary = "관리자 목록 조회", description = "시스템에 등록된 모든 관리자/운영자 목록을 조회합니다.")
    @GetMapping
    @RequireRoles(AdminRole.ADMIN)
    public ResponseEntity<List<AccountResponse>> getAccounts() {
        List<AccountResponse> responses = adminMemberRepository.findAll().stream()
                .map(AccountResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @Operation(summary = "관리자 계정 신규 생성", description = "신규 관리자/운영자 계정을 DB에 등록하고 .htpasswd 파일에 패스워드를 추가합니다.")
    @PostMapping
    @RequireRoles(AdminRole.ADMIN)
    public ResponseEntity<Void> createAccount(@Valid @RequestBody CreateAccountRequest request) {
        String username = request.getUsername().trim();
        if (adminMemberRepository.existsById(username)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 존재하는 사용자 아이디입니다.");
        }

        // DB 저장
        AdminMember member = new AdminMember(
                username,
                request.getNickname(),
                request.getEmail(),
                request.getRole());
        adminMemberRepository.save(member);

        // htpasswd 저장
        htpasswdUseCase.saveOrUpdateUser(username, request.getPassword());

        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @Operation(summary = "관리자 계정 삭제", description = "관리자/운영자 계정을 DB 및 .htpasswd 파일에서 삭제합니다. 본인 계정이나 마스터 계정은 삭제할 수 없습니다.")
    @DeleteMapping("/{username}")
    @RequireRoles(AdminRole.ADMIN)
    public ResponseEntity<Void> deleteAccount(
            @PathVariable String username,
            @RequestHeader(value = "X-Remote-User", required = false) String remoteUser) {
        String targetUsername = username.trim();

        if (targetUsername.equals("runday-cs-admin")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "마스터 관리자 계정은 삭제할 수 없습니다.");
        }

        if (remoteUser != null && targetUsername.equals(remoteUser.trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 로그인한 본인 계정은 삭제할 수 없습니다.");
        }

        if (!adminMemberRepository.existsById(targetUsername)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 계정을 찾을 수 없습니다.");
        }

        // DB 삭제
        adminMemberRepository.deleteById(targetUsername);

        // htpasswd 삭제
        htpasswdUseCase.deleteUser(targetUsername);

        return ResponseEntity.ok().build();
    }

    @Data
    public static class CreateAccountRequest {
        @NotBlank(message = "아이디는 필수 입력 값입니다.")
        @Size(min = 4, max = 50, message = "아이디는 4자 이상 50자 이하여야 합니다.")
        @Pattern(regexp = "^[a-zA-Z0-9_-]+$", message = "아이디는 영문, 숫자, 언더바(_), 하이픈(-)만 가능합니다.")
        private String username;

        @NotBlank(message = "비밀번호는 필수 입력 값입니다.")
        @Size(min = 6, max = 100, message = "비밀번호는 6자 이상 100자 이하여야 합니다.")
        private String password;

        @NotBlank(message = "표시 이름은 필수 입력 값입니다.")
        @Size(max = 50, message = "표시 이름은 50자 이하여야 합니다.")
        private String nickname;

        @Email(message = "이메일 형식이어야 합니다.")
        @Size(max = 100)
        private String email;

        @NotBlank(message = "역할은 필수 입력 값입니다.")
        @Pattern(regexp = "^(ADMIN|OPERATOR)$", message = "역할은 ADMIN 또는 OPERATOR만 가능합니다.")
        private String role;
    }

    @Data
    public static class AccountResponse {
        private String username;
        private String nickname;
        private String email;
        private String role;
        private OffsetDateTime createdAt;

        public static AccountResponse from(AdminMember member) {
            AccountResponse res = new AccountResponse();
            res.setUsername(member.getUsername());
            res.setNickname(member.getNickname());
            res.setEmail(member.getEmail());
            res.setRole(member.getRole());
            res.setCreatedAt(member.getCreatedAt());
            return res;
        }
    }
}
