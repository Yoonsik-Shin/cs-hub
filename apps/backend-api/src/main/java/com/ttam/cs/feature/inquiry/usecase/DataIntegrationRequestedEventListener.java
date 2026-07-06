package com.ttam.cs.feature.inquiry.usecase;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import com.ttam.cs.feature.inquiry.usecase.event.DataIntegrationRequestedEvent;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class DataIntegrationRequestedEventListener {

    private final IntegrateInquiryDataUseCase integrateInquiryDataUseCase;

    @EventListener
    public void handle(DataIntegrationRequestedEvent event) {
        var payload = event.payload();

        integrateInquiryDataUseCase.execute(
                payload.channel(),
                payload.items().stream()
                        .map(item -> new IntegrateInquiryDataUseCase.IntegrationItem(
                                item.timestamp(),
                                item.userCode(),
                                item.channelMetadata(),
                                item.deviceInfo(),
                                item.content(),
                                item.imageUrls()))
                        .toList());
    }
}
