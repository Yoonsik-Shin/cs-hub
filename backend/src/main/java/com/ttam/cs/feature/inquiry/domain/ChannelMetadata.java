package com.ttam.cs.feature.inquiry.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import java.util.HashMap;
import java.util.Map;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "metadataType")
public interface ChannelMetadata {

    Map<String, Class<? extends ChannelMetadata>> REGISTRY = new HashMap<>();

    static void register(String channel, Class<? extends ChannelMetadata> clazz) {
        REGISTRY.put(channel.toUpperCase(), clazz);
    }

    static Class<? extends ChannelMetadata> getMetadataClass(String channel) {
        if (channel == null) {
            return null;
        }
        return REGISTRY.get(channel.toUpperCase());
    }

    @JsonIgnore
    String getUniqueKey();
}
