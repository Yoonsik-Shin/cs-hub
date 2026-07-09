package com.ttam.cs.feature.inquiry.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.JPAExpressions;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.ttam.cs.common.dto.CursorPage;
import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.entity.QCustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.entity.QInquiryBookmark;
import com.ttam.cs.infra.security.crypto.PiiAwareObjectMapper;
import com.ttam.cs.infra.security.crypto.PiiEncryptionUtils;
import lombok.RequiredArgsConstructor;
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
    private final PiiAwareObjectMapper piiAwareObjectMapper;
    private final PiiEncryptionUtils piiEncryptionUtils;

    // ─── 조회 (QueryDSL) ────────────────────────────────────────────

    @Override
    public CursorPage<CustomerInquiry> searchInquiries(
            List<String> channels,
            String userCode,
            List<CustomerInquiry.Status> statuses,
            OffsetDateTime startDateTime,
            OffsetDateTime endDateTime,
            Boolean isManual,
            Boolean bookmarkedOnly,
            Boolean userCodeMissing,
            String operatorId,
            UUID cursor,
            int size,
            String sort) {
        if (Boolean.TRUE.equals(bookmarkedOnly) && !StringUtils.hasText(operatorId)) {
            return new CursorPage<>(List.of(), null, false);
        }

        boolean ascending = "asc".equalsIgnoreCase(sort);

        QCustomerInquiry customerInquiry = QCustomerInquiry.customerInquiry;

        JPAQuery<CustomerInquiry> query = queryFactory
                .selectFrom(customerInquiry);

        List<CustomerInquiry> result = query
                .where(
                        parentIdIsNull(),
                        channelIn(channels),
                        userCodeFilter(userCode, userCodeMissing),
                        statusIn(statuses),
                        timestampBetween(startDateTime, endDateTime),
                        isManualEq(isManual),
                        bookmarkedByOperator(bookmarkedOnly, operatorId),
                        cursorBeyond(cursor, ascending))
                .limit(size + 1)
                .orderBy(
                        ascending ? customerInquiry.timestamp.asc() : customerInquiry.timestamp.desc(),
                        ascending ? customerInquiry.id.asc() : customerInquiry.id.desc())
                .fetch();

        return CursorPage.of(result, size, CustomerInquiry::getId);
    }

    @Override
    public long countInquiries(
            List<String> channels,
            String userCode,
            List<CustomerInquiry.Status> statuses,
            OffsetDateTime startDateTime,
            OffsetDateTime endDateTime,
            Boolean isManual,
            Boolean bookmarkedOnly,
            Boolean userCodeMissing,
            String operatorId,
            int limit) {
        if (Boolean.TRUE.equals(bookmarkedOnly) && !StringUtils.hasText(operatorId)) {
            return 0;
        }

        QCustomerInquiry customerInquiry = QCustomerInquiry.customerInquiry;

        JPAQuery<UUID> query = queryFactory
                .select(customerInquiry.id)
                .from(customerInquiry);

        Integer boundedLimit = Math.max(1, limit);
        List<UUID> ids = query
                .where(
                        parentIdIsNull(),
                        channelIn(channels),
                        userCodeFilter(userCode, userCodeMissing),
                        statusIn(statuses),
                        timestampBetween(startDateTime, endDateTime),
                        isManualEq(isManual),
                        bookmarkedByOperator(bookmarkedOnly, operatorId))
                .limit(boundedLimit)
                .fetch();

        return ids.size();
    }

    @Override
    public List<UUID> findInquiryIds(
            List<String> channels,
            String userCode,
            List<CustomerInquiry.Status> statuses,
            OffsetDateTime startDateTime,
            OffsetDateTime endDateTime,
            Boolean isManual,
            Boolean bookmarkedOnly,
            Boolean userCodeMissing,
            String operatorId,
            List<UUID> excludedIds,
            int limit) {
        if (Boolean.TRUE.equals(bookmarkedOnly) && !StringUtils.hasText(operatorId)) {
            return List.of();
        }

        QCustomerInquiry customerInquiry = QCustomerInquiry.customerInquiry;
        Integer boundedLimit = Math.max(1, limit);

        return queryFactory
                .select(customerInquiry.id)
                .from(customerInquiry)
                .where(
                        parentIdIsNull(),
                        channelIn(channels),
                        userCodeFilter(userCode, userCodeMissing),
                        statusIn(statuses),
                        timestampBetween(startDateTime, endDateTime),
                        isManualEq(isManual),
                        bookmarkedByOperator(bookmarkedOnly, operatorId),
                        idNotIn(excludedIds))
                .limit(boundedLimit)
                .orderBy(customerInquiry.id.desc())
                .fetch();
    }

    // 정렬 기준이 timestamp이므로, 커서 페이지네이션도 (timestamp, id) 복합 키 기준으로 다음 구간을 판별해야 한다.
    // id(UUIDv7)는 데이터 적재 시각 기준이라 백필된 문의는 timestamp와 순서가 어긋날 수 있어 id만으로는 커서를 비교할 수 없다.
    private BooleanExpression cursorBeyond(UUID cursor, boolean ascending) {
        if (cursor == null) {
            return null;
        }
        QCustomerInquiry customerInquiry = QCustomerInquiry.customerInquiry;
        OffsetDateTime cursorTimestamp = queryFactory
                .select(customerInquiry.timestamp)
                .from(customerInquiry)
                .where(customerInquiry.id.eq(cursor))
                .fetchOne();
        if (cursorTimestamp == null) {
            return ascending ? customerInquiry.id.gt(cursor) : customerInquiry.id.lt(cursor);
        }
        if (ascending) {
            return customerInquiry.timestamp.gt(cursorTimestamp)
                    .or(customerInquiry.timestamp.eq(cursorTimestamp).and(customerInquiry.id.gt(cursor)));
        }
        return customerInquiry.timestamp.lt(cursorTimestamp)
                .or(customerInquiry.timestamp.eq(cursorTimestamp).and(customerInquiry.id.lt(cursor)));
    }

    private BooleanExpression idNotIn(List<UUID> excludedIds) {
        return excludedIds == null || excludedIds.isEmpty() ? null
                : QCustomerInquiry.customerInquiry.id.notIn(excludedIds);
    }

    private BooleanExpression parentIdIsNull() {
        return QCustomerInquiry.customerInquiry.parentId.isNull();
    }

    private BooleanExpression channelIn(List<String> channels) {
        List<String> normalizedChannels = channels == null ? List.of()
                : channels.stream()
                        .filter(StringUtils::hasText)
                        .toList();
        return normalizedChannels.isEmpty() ? null : QCustomerInquiry.customerInquiry.channel.in(normalizedChannels);
    }

    private BooleanExpression isManualEq(Boolean isManual) {
        return isManual != null ? QCustomerInquiry.customerInquiry.isManual.eq(isManual) : null;
    }

    private BooleanExpression bookmarkedByOperator(Boolean bookmarkedOnly, String operatorId) {
        if (!Boolean.TRUE.equals(bookmarkedOnly)) {
            return null;
        }

        QInquiryBookmark bookmark = QInquiryBookmark.inquiryBookmark;
        return QCustomerInquiry.customerInquiry.id.in(
                JPAExpressions
                        .select(bookmark.inquiryId)
                        .from(bookmark)
                        .where(bookmark.operatorId.eq(operatorId.trim())));
    }

    private BooleanExpression userCodeFilter(String userCode, Boolean userCodeMissing) {
        if (StringUtils.hasText(userCode)) {
            return QCustomerInquiry.customerInquiry.userCode.eq(userCode);
        }
        if (Boolean.TRUE.equals(userCodeMissing)) {
            return QCustomerInquiry.customerInquiry.userCode.isNull()
                    .or(QCustomerInquiry.customerInquiry.userCode.eq(""));
        }
        return null;
    }

    private BooleanExpression statusIn(List<CustomerInquiry.Status> statuses) {
        return statuses == null || statuses.isEmpty() ? null : QCustomerInquiry.customerInquiry.status.in(statuses);
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
                        "(id, unique_key, parent_id, channel, timestamp, user_code, channel_metadata, device_info, status, content, image_urls, is_manual, email_sender_hash, created_at, updated_at) "
                        +
                        "VALUES ");

        StringJoiner valuesJoiner = new StringJoiner(", ");
        List<Object> params = new ArrayList<>();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        for (CustomerInquiry inquiry : inquiries) {
            valuesJoiner.add("(?::uuid, ?::uuid, ?::uuid, ?, ?, ?, ?::jsonb, ?::jsonb, ?, ?, ?::jsonb, ?, ?, ?, ?)");

            params.add(inquiry.getId().toString());
            params.add(inquiry.getUniqueKey().toString());
            params.add(inquiry.getParentId() != null ? inquiry.getParentId().toString() : null);
            params.add(inquiry.getChannel());
            params.add(Timestamp.from(inquiry.getTimestamp().toInstant()));
            params.add(inquiry.getUserCode());
            params.add(toJson(inquiry.getChannelMetadata()));
            params.add(toJson(inquiry.getDeviceInfo()));
            params.add(inquiry.getStatus().name());
            params.add(piiEncryptionUtils.encrypt(inquiry.getContent()));
            params.add(toJson(inquiry.getImageUrls()));
            params.add(inquiry.isManual());
            params.add(inquiry.getEmailSenderHash());
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
            return piiAwareObjectMapper.unwrap().writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to serialize to JSON", e);
        }
    }
}
