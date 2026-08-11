package com.ttam.cs.feature.auth.usecase;

import com.ttam.cs.common.exception.BusinessException;
import com.ttam.cs.common.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.PosixFilePermission;
import java.util.List;
import java.util.Set;

/**
 * NGINX Basic Auth의 인증 정보 파일(.htpasswd)을 동적으로 제어하는 서비스입니다.
 */
@Component
@Slf4j
public class HtpasswdUseCase {

    @Value("${admin.htpasswd-path:/app/config/.htpasswd}")
    private String htpasswdPath;

    /**
     * 계정을 생성하거나 비밀번호를 변경합니다.
     * NGINX Basic Auth와 호환되는 BCrypt 해시형태로 저장됩니다.
     *
     * @param username      사용자 아이디
     * @param plainPassword 평문 비밀번호
     * @return 롤백 시 복원할 수 있는 기존 원문 항목. 신규 항목이면 {@code null}
     */
    public synchronized String saveOrUpdateUser(String username, String plainPassword) {
        String hashedPassword = BCrypt.hashpw(plainPassword, BCrypt.gensalt());
        return replaceUserEntry(username, username + ":" + hashedPassword);
    }

    /**
     * 특정 사용자를 패스워드 파일에서 제거합니다.
     *
     * @return 롤백 시 복원할 수 있는 기존 원문 항목. 존재하지 않으면 {@code null}
     */
    public synchronized String deleteUser(String username) {
        return replaceUserEntry(username, null);
    }

    /**
     * DB 트랜잭션 롤백 시 기존 항목을 그대로 복원합니다.
     */
    public synchronized void restoreUserEntry(String username, String previousEntry) {
        replaceUserEntry(username, previousEntry);
    }

    private String replaceUserEntry(String username, String replacement) {

        try {
            Path path = Paths.get(htpasswdPath).toAbsolutePath();
            if (!Files.exists(path)) {
                if (replacement == null) {
                    return null;
                }
                Files.createDirectories(path.getParent());
                Files.createFile(path);
            }

            List<String> lines = Files.readAllLines(path);
            String previousEntry = null;

            for (int i = 0; i < lines.size(); i++) {
                String line = lines.get(i).trim();
                if (line.startsWith(username + ":")) {
                    previousEntry = lines.get(i);
                    if (replacement == null) {
                        lines.remove(i);
                    } else {
                        lines.set(i, replacement);
                    }
                    break;
                }
            }

            if (previousEntry == null && replacement != null) {
                lines.add(replacement);
            }

            if (previousEntry != null || replacement != null) {
                writeAtomically(path, lines);
                log.info("Successfully updated htpasswd entry for user: {}", username);
            }
            return previousEntry;
        } catch (IOException e) {
            log.error("Failed to update htpasswd entry for user: {}", username, e);
            throw new BusinessException(ErrorCode.HTPASSWD_IO_ERROR, e);
        }
    }

    private void writeAtomically(Path path, List<String> lines) throws IOException {
        Path absolutePath = path.toAbsolutePath();
        Path parent = absolutePath.getParent();
        Files.createDirectories(parent);
        Path temporaryPath = Files.createTempFile(parent, ".htpasswd-", ".tmp");
        try {
            Set<PosixFilePermission> permissions = null;
            try {
                permissions = Files.getPosixFilePermissions(absolutePath);
            } catch (UnsupportedOperationException ignored) {
                // POSIX 권한을 지원하지 않는 파일 시스템에서는 기본 권한을 사용한다.
            }

            Files.write(temporaryPath, lines, StandardOpenOption.TRUNCATE_EXISTING);
            if (permissions != null) {
                Files.setPosixFilePermissions(temporaryPath, permissions);
            }
            try {
                Files.move(temporaryPath, absolutePath, StandardCopyOption.ATOMIC_MOVE,
                        StandardCopyOption.REPLACE_EXISTING);
            } catch (AtomicMoveNotSupportedException ignored) {
                Files.move(temporaryPath, absolutePath, StandardCopyOption.REPLACE_EXISTING);
            }
        } finally {
            Files.deleteIfExists(temporaryPath);
        }
    }
}
