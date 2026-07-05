package com.ttam.cs.feature.inquiry.api.http.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.ttam.cs.feature.inquiry.domain.vo.ChannelMetadata;
import com.ttam.cs.feature.inquiry.domain.vo.DeviceInfo;
import com.ttam.cs.infra.webhooks.dto.request.N8nWebhookRequest.N8nWorkflowPayload;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonDeserialize(using = DataIntegrationPayload.Deserializer.class)
public record DataIntegrationPayload(
                @NotBlank(message = "채널 정보는 필수입니다.") String channel,
                @NotEmpty(message = "통합할 아이템 목록은 필수입니다.") @Valid List<IntegrationItem> items)
                implements N8nWorkflowPayload {

        @JsonIgnoreProperties(ignoreUnknown = true)
        public record IntegrationItem(
                        String timestamp,

                        String userCode,

                        @Valid ChannelMetadata channelMetadata,

                        String content,

                        @Valid DeviceInfo deviceInfo,

                        List<String> imageUrls) {
        }

        public static class Deserializer extends JsonDeserializer<DataIntegrationPayload> {
                @Override
                public DataIntegrationPayload deserialize(JsonParser p, DeserializationContext ctxt)
                                throws IOException {
                        ObjectMapper mapper = (ObjectMapper) p.getCodec();
                        JsonNode node = mapper.readTree(p);

                        String channel = node.has("channel") && !node.get("channel").isNull()
                                        ? node.get("channel").asText()
                                        : null;
                        Class<? extends ChannelMetadata> metadataClass = getMetadataClass(channel);

                        JsonNode itemsNode = node.get("items");
                        List<IntegrationItem> items = new ArrayList<>();
                        if (itemsNode != null && itemsNode.isArray()) {
                                for (JsonNode itemNode : itemsNode) {
                                        String timestamp = itemNode.has("timestamp")
                                                        && !itemNode.get("timestamp").isNull()
                                                                        ? itemNode.get("timestamp").asText()
                                                                        : null;
                                        String userCode = itemNode.has("userCode") && !itemNode.get("userCode").isNull()
                                                        ? itemNode.get("userCode").asText()
                                                        : null;
                                        String content = itemNode.has("content") && !itemNode.get("content").isNull()
                                                        ? itemNode.get("content").asText()
                                                        : null;

                                        DeviceInfo deviceInfo = null;
                                        if (itemNode.has("deviceInfo") && !itemNode.get("deviceInfo").isNull()) {
                                                deviceInfo = mapper.treeToValue(itemNode.get("deviceInfo"),
                                                                DeviceInfo.class);
                                        }

                                        ChannelMetadata channelMetadata = null;
                                        if (itemNode.has("channelMetadata") && !itemNode.get("channelMetadata").isNull()
                                                        && metadataClass != null) {
                                                JsonNode metaNode = itemNode.get("channelMetadata");
                                                if (metaNode.isObject()) {
                                                        ((com.fasterxml.jackson.databind.node.ObjectNode) metaNode)
                                                                        .put("metadataType", channel);
                                                }
                                                channelMetadata = mapper.treeToValue(metaNode, metadataClass);
                                        }

                                        List<String> imageUrls = new ArrayList<>();
                                        if (itemNode.has("imageUrls") && !itemNode.get("imageUrls").isNull()) {
                                                JsonNode imageUrlsNode = itemNode.get("imageUrls");
                                                if (imageUrlsNode.isArray()) {
                                                        for (JsonNode urlNode : imageUrlsNode) {
                                                                imageUrls.add(urlNode.asText());
                                                        }
                                                }
                                        }

                                        items.add(new IntegrationItem(timestamp, userCode, channelMetadata, content,
                                                        deviceInfo, imageUrls));
                                }
                        }

                        return new DataIntegrationPayload(channel, items);
                }

                private Class<? extends ChannelMetadata> getMetadataClass(String channel) {
                        return ChannelMetadata.getMetadataClass(channel);
                }
        }

}
