package com.ttam.cs.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.stream.Consumer;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.stream.StreamListener;
import org.springframework.data.redis.stream.StreamMessageListenerContainer;

import org.springframework.core.task.AsyncTaskExecutor;

import java.time.Duration;
import java.util.Map;

@Configuration
@Slf4j
public class RedisStreamConfig {

    public static final String STREAM_KEY = "inquiry:stream";
    public static final String DATABASE_GROUP = "database-persister-group";
    public static final String SLACK_GROUP = "slack-notifier-group";
    public static final String AI_GROUP = "ai-analyzer-group";

    private void initializeStreamAndGroups(StringRedisTemplate redisTemplate) {
        try {
            if (Boolean.FALSE.equals(redisTemplate.hasKey(STREAM_KEY))) {
                log.info("Initializing Redis Stream: {}", STREAM_KEY);
                redisTemplate.opsForStream().add(STREAM_KEY, Map.of("_init", "true"));
            }

            createConsumerGroup(redisTemplate, DATABASE_GROUP);
            createConsumerGroup(redisTemplate, SLACK_GROUP);
            createConsumerGroup(redisTemplate, AI_GROUP);

        } catch (Exception e) {
            log.error("Failed to initialize Redis Stream or Consumer Groups", e);
        }
    }

    private void createConsumerGroup(StringRedisTemplate redisTemplate, String groupName) {
        try {
            redisTemplate.opsForStream().createGroup(STREAM_KEY, ReadOffset.from("0-0"), groupName);
            log.info("Created Consumer Group: {}", groupName);
        } catch (Exception e) {
            if (e.getMessage() != null && e.getMessage().contains("BUSYGROUP")) {
                log.info("Consumer Group already exists: {}", groupName);
            } else {
                log.warn("Error creating Consumer Group: {}", groupName, e);
            }
        }
    }

    @Bean
    public StreamMessageListenerContainer<String, MapRecord<String, String, String>> streamMessageListenerContainer(
            RedisConnectionFactory connectionFactory,
            StringRedisTemplate redisTemplate,
            @org.springframework.beans.factory.annotation.Qualifier("dbListener") StreamListener<String, MapRecord<String, String, String>> dbListener,
            @org.springframework.beans.factory.annotation.Qualifier("slackNotifierListener") StreamListener<String, MapRecord<String, String, String>> slackListener,
            @org.springframework.beans.factory.annotation.Qualifier("AIAnalyzerListener") StreamListener<String, MapRecord<String, String, String>> aiListener,
            AsyncTaskExecutor taskExecutor
    ) {
        // 컨테이너 시작 직전에 동기적으로 스트림과 그룹이 존재하도록 보장하여 NOGROUP 원천 차단!
        initializeStreamAndGroups(redisTemplate);

        StreamMessageListenerContainer.StreamMessageListenerContainerOptions<String, MapRecord<String, String, String>> options =
                StreamMessageListenerContainer.StreamMessageListenerContainerOptions.builder()
                        .pollTimeout(Duration.ofSeconds(1))
                        .serializer(RedisSerializer.string())
                        .executor(taskExecutor)
                        .build();

        StreamMessageListenerContainer<String, MapRecord<String, String, String>> container =
                StreamMessageListenerContainer.create(connectionFactory, options);

        // Database Persister Group Subscription
        container.receive(
                Consumer.from(DATABASE_GROUP, "db-consumer-1"),
                StreamOffset.create(STREAM_KEY, ReadOffset.lastConsumed()),
                dbListener
        );

        // Slack Group Subscription
        container.receive(
                Consumer.from(SLACK_GROUP, "slack-consumer-1"),
                StreamOffset.create(STREAM_KEY, ReadOffset.lastConsumed()),
                slackListener
        );

        // AI Group Subscription
        container.receive(
                Consumer.from(AI_GROUP, "ai-consumer-1"),
                StreamOffset.create(STREAM_KEY, ReadOffset.lastConsumed()),
                aiListener
        );

        container.start();
        log.info("Redis StreamMessageListenerContainer started.");
        return container;
    }
}
