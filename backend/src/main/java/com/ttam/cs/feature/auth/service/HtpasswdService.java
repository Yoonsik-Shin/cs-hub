package com.ttam.cs.feature.auth.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * NGINX Basic Auth의인증 정보 파일(.htpasswd)을 동적으로 제어하는 서비스입니다.
 */
@Service
@Slf4j
public class HtpasswdService {

    @Value("${admin.htpasswd-path:/app/config/.htpasswd}")
    private String htpasswdPath;

    /**
     * 계정을 생성하거나 비밀번호를 변경합니다.
     * NGINX Basic Auth와 호환되는 BCrypt 해시형태로 저장됩니다.
     *
     * @param username      사용자 아이디
     * @param plainPassword 평문 비밀번호
     */
    public synchronized void saveOrUpdateUser(String username, String plainPassword) {
        String hashedPassword = BCrypt.hashpw(plainPassword, BCrypt.gensalt());
        String entry = username + ":" + hashedPassword;

        try {
            Path path = Paths.get(htpasswdPath);
            if (!Files.exists(path)) {
                Files.createDirectories(path.getParent());
                Files.createFile(path);
            }

            List<String> lines = Files.readAllLines(path);
            boolean updated = false;

            for (int i = 0; i < lines.size(); i++) {
                String line = lines.get(i).trim();
                if (line.startsWith(username + ":")) {
                    lines.set(i, entry);
                    updated = true;
                    break;
                }
            }

            if (!updated) {
                // 비어있는 줄이 아닌 의미 있는 정보 뒤에 붙을 수 있도록 리스트에 추가
                lines.add(entry);
            }

            // 파일에 기록
            Files.write(path, lines, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
            log.info("Successfully updated htpasswd entry for user: {}", username);
        } catch (IOException e) {
            log.error("Failed to write user to htpasswd file: {}", username, e);
            throw new RuntimeException("비밀번호 파일 저장 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * 특정 사용자를 패스워드 파일에서 제거합니다.
     *
     * @param username 사용자 아이디
     */
    public synchronized void deleteUser(String username) {
        try {
            Path path = Paths.get(htpasswdPath);
            if (!Files.exists(path)) {
                return;
            }

            List<String> lines = Files.readAllLines(path);
            List<String> filteredLines = lines.stream()
                    .filter(line -> !line.trim().startsWith(username + ":"))
                    .collect(Collectors.toList());

            Files.write(path, filteredLines, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
            log.info("Successfully deleted htpasswd entry for user: {}", username);
        } catch (IOException e) {
            log.error("Failed to delete user from htpasswd file: {}", username, e);
            throw new RuntimeException("비밀번호 파일에서 사용자 삭제 중 오류가 발생했습니다.", e);
        }
    }
}
