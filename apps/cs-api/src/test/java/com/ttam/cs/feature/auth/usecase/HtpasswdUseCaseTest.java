package com.ttam.cs.feature.auth.usecase;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HtpasswdUseCaseTest {

    @TempDir
    Path temporaryDirectory;

    @Test
    void replacesAndRestoresAnEntryWithoutChangingOtherUsers() throws Exception {
        Path htpasswd = temporaryDirectory.resolve(".htpasswd");
        Files.write(htpasswd, List.of("admin:$2y$admin", "operator:$2y$old"));
        HtpasswdUseCase useCase = useCaseFor(htpasswd);

        String previousEntry = useCase.saveOrUpdateUser("operator", "new-password");
        useCase.restoreUserEntry("operator", previousEntry);

        assertEquals(List.of("admin:$2y$admin", "operator:$2y$old"), Files.readAllLines(htpasswd));
    }

    @Test
    void returnsRemovedEntryForTransactionCompensation() throws Exception {
        Path htpasswd = temporaryDirectory.resolve(".htpasswd");
        Files.write(htpasswd, List.of("operator:$2y$old"));
        HtpasswdUseCase useCase = useCaseFor(htpasswd);

        String removedEntry = useCase.deleteUser("operator");

        assertEquals("operator:$2y$old", removedEntry);
        assertTrue(Files.readAllLines(htpasswd).isEmpty());
        assertNull(useCase.deleteUser("missing"));
    }

    private HtpasswdUseCase useCaseFor(Path path) {
        HtpasswdUseCase useCase = new HtpasswdUseCase();
        ReflectionTestUtils.setField(useCase, "htpasswdPath", path.toString());
        return useCase;
    }
}
