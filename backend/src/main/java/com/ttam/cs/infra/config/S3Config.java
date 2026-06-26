package com.ttam.cs.infra.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;

@Configuration
public class S3Config {

    @Value("${s3.endpoint:}")
    private String endpoint;

    @Value("${s3.access-key}")
    private String accessKey;

    @Value("${s3.secret-key}")
    private String secretKey;

    @Value("${s3.region:ap-northeast-2}")
    private String region;

    @Bean
    public S3Client s3Client() {
        var credentials = AwsBasicCredentials.create(accessKey, secretKey);
        var builder = S3Client.builder()
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .region(Region.of(region));

        if (StringUtils.hasText(endpoint)) {
            builder.endpointOverride(URI.create(endpoint))
                   .serviceConfiguration(S3Configuration.builder()
                           .pathStyleAccessEnabled(true)
                           .build());
        }

        return builder.build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        var credentials = AwsBasicCredentials.create(accessKey, secretKey);
        var builder = S3Presigner.builder()
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .region(Region.of(region));

        if (StringUtils.hasText(endpoint)) {
            builder.endpointOverride(URI.create(endpoint))
                   .serviceConfiguration(S3Configuration.builder()
                           .pathStyleAccessEnabled(true)
                           .build());
        }

        return builder.build();
    }
}
