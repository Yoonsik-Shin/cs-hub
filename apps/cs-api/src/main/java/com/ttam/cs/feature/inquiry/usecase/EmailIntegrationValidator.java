package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.inquiry.domain.vo.ChannelMetadata;
import com.ttam.cs.feature.inquiry.domain.vo.EmailMetadata;
import com.ttam.cs.feature.inquiry.exception.InvalidInquiryRequestException;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class EmailIntegrationValidator {

    public EmailMetadata validate(ChannelMetadata metadata, String content, List<String> imageUrls) {
        if (!(metadata instanceof EmailMetadata emailMetadata)) {
            throw new InvalidInquiryRequestException("EMAIL integration item requires EmailMetadata.");
        }

        if (!hasText(content) && (imageUrls == null || imageUrls.isEmpty())) {
            throw new InvalidInquiryRequestException("Email must include text content or at least one image. uid="
                    + emailUid(emailMetadata) + ", messageId=" + cleanMessageId(emailMetadata.getMessageId()));
        }

        if (!hasText(cleanMessageId(emailMetadata.getMessageId())) && emailUid(emailMetadata) == null) {
            throw new InvalidInquiryRequestException("Email identity is missing. Expected message-id or IMAP uid.");
        }

        return emailMetadata;
    }

    private Long emailUid(EmailMetadata emailMetadata) {
        return emailMetadata.attributes() != null ? emailMetadata.attributes().uid() : null;
    }

    private String cleanMessageId(String messageId) {
        return messageId != null ? messageId.replace("<", "").replace(">", "").trim() : null;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
