package com.ttam.cs.feature.inquiry.api;

import com.ttam.cs.feature.inquiry.api.http.dto.request.DataIntegrationPayload;
import com.ttam.cs.feature.inquiry.service.CustomerInquiryService;
import com.ttam.cs.infra.webhooks.handler.n8n.N8nWorkflowHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class DataIntegrationWorkflowHandler implements N8nWorkflowHandler<DataIntegrationPayload> {

    private final CustomerInquiryService customerInquiryService;

    @Override
    public String getWorkflowName() {
        return "csDataIntegration";
    }

    @Override
    public Class<DataIntegrationPayload> getPayloadType() {
        return DataIntegrationPayload.class;
    }

    @Override
    public void execute(DataIntegrationPayload payload) {
        customerInquiryService.integrateInquiries(payload.channel(), payload.items());
    }
}
