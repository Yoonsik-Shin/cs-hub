package com.ttam.cs.feature.inquiry.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.core.types.dsl.Expressions;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.ttam.cs.common.dto.CursorPage;
import com.ttam.cs.feature.inquiry.domain.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.QCustomerInquiry;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.support.PageableExecutionUtils;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.util.StringUtils;

import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.StringJoiner;
import java.util.UUID;

@RequiredArgsConstructor
public class CustomerInquiryRepositoryCustomImpl implements CustomerInquiryRepositoryCustom {

    private final JPAQueryFactory queryFactory;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    // ─── 조회 (QueryDSL) ────────────────────────────────────────────

    @Override
    public CursorPage<CustomerInquiry> searchInquiries(
            String channel,
            String userCode,
            CustomerInquiry.Status status,
            String contentKeyword,
            OffsetDateTime startDateTime,
            OffsetDateTime endDateTime,
            UUID cursor,
            int size) {
        QCustomerInquiry customerInquiry = QCustomerInquiry.customerInquiry;

        List<CustomerInquiry> result = queryFactory
                .selectFrom(customerInquiry)
                .where(
                        channelEq(channel),
                        userCodeEq(userCode),
                        statusEq(status),
                        contentContains(contentKeyword),
                        timestampBetween(startDateTime, endDateTime),
                        cursorLessThan(cursor))
                .limit(size + 1)
                .orderBy(customerInquiry.id.desc())
                .fetch();

        return CursorPage.of(result, size, CustomerInquiry::getId);
    }

    private BooleanExpression cursorLessThan(UUID cursor) {
        return cursor != null ? QCustomerInquiry.customerInquiry.id.lt(cursor) : null;
    }

    private BooleanExpression channelEq(String channel) {
        return StringUtils.hasText(channel) ? QCustomerInquiry.customerInquiry.channel.eq(channel) : null;
    }

    private BooleanExpression userCodeEq(String userCode) {
        return StringUtils.hasText(userCode) ? QCustomerInquiry.customerInquiry.userCode.eq(userCode) : null;
    }

    private BooleanExpression statusEq(CustomerInquiry.Status status) {
        return status != null ? QCustomerInquiry.customerInquiry.status.eq(status) : null;
    }

    private BooleanExpression contentContains(String keyword) {
        return StringUtils.hasText(keyword) ? QCustomerInquiry.customerInquiry.content.contains(keyword) : null;
    }

    private BooleanExpression timestampBetween(OffsetDateTime start, OffsetDateTime end) {
        if (start != null && end != null) {
            return QCustomerInquiry.customerInquiry.timestamp.between(start, end);
        } else if (start != null) {
            return QCustomerInquiry.customerInquiry.timestamp.goe(start);
        } else if (end != null) {
            return QCustomerInquiry.customerInquiry.timestamp.loe(end);
        }
        return null;
    }

    // ─── 대량 삽입 (JdbcTemplate) ──────────────────────────────────

    @Override
    public void bulkInsert(List<CustomerInquiry> inquiries) {
        if (inquiries == null || inquiries.isEmpty()) {
            return;
        }

        StringBuilder sql = new StringBuilder(
                "INSERT INTO customer_inquiries " +
                        "(id, unique_key, channel, timestamp, user_code, channel_metadata, device_info, status, content, created_at, updated_at) "
                        +
                        "VALUES ");

        StringJoiner valuesJoiner = new StringJoiner(", ");
        List<Object> params = new ArrayList<>();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        for (CustomerInquiry inquiry : inquiries) {
            valuesJoiner.add("(?::uuid, ?::uuid, ?, ?, ?, ?::jsonb, ?::jsonb, ?, ?, ?, ?)");

            params.add(inquiry.getId().toString());
            params.add(inquiry.getUniqueKey().toString());
            params.add(inquiry.getChannel());
            params.add(Timestamp.from(inquiry.getTimestamp().toInstant()));
            params.add(inquiry.getUserCode());
            params.add(toJson(inquiry.getChannelMetadata()));
            params.add(toJson(inquiry.getDeviceInfo()));
            params.add(inquiry.getStatus().name());
            params.add(inquiry.getContent());
            params.add(Timestamp.from(now.toInstant()));
            params.add(Timestamp.from(now.toInstant()));
        }

        sql.append(valuesJoiner);
        sql.append(" ON CONFLICT (unique_key) DO NOTHING");
        jdbcTemplate.update(sql.toString(), params.toArray());
    }

    private String toJson(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to serialize to JSON", e);
        }
    }
}
