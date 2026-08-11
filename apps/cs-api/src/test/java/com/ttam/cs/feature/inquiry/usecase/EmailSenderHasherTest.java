package com.ttam.cs.feature.inquiry.usecase;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ttam.cs.infra.security.crypto.PiiEncryptionUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class EmailSenderHasherTest {

    @Mock
    private PiiEncryptionUtils piiEncryptionUtils;

    @Test
    void normalizesDisplayNameAndCaseBeforeHashing() {
        EmailSenderHasher hasher = new EmailSenderHasher(piiEncryptionUtils);
        when(piiEncryptionUtils.hmacHex("customer@test.com")).thenReturn("sender-hash");

        String result = hasher.hash("Customer <CUSTOMER@Test.Com>");

        assertEquals("sender-hash", result);
        verify(piiEncryptionUtils).hmacHex("customer@test.com");
    }

    @Test
    void returnsNullWithoutHashingWhenSenderIsBlank() {
        EmailSenderHasher hasher = new EmailSenderHasher(piiEncryptionUtils);

        assertNull(hasher.hash("  "));
        verify(piiEncryptionUtils, never()).hmacHex(org.mockito.ArgumentMatchers.any());
    }
}
