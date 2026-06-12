package com.ttam.cs.inquiry.repo;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.ttam.cs.inquiry.domain.CustomerInquiry;
import com.ttam.cs.inquiry.domain.QCustomerInquiry;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.support.PageableExecutionUtils;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.util.List;

@RequiredArgsConstructor
public class CustomerInquiryRepositoryCustomImpl implements CustomerInquiryRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<CustomerInquiry> searchInquiries(
            String source,
            String category,
            CustomerInquiry.Status status,
            String contentKeyword,
            OffsetDateTime startDateTime,
            OffsetDateTime endDateTime,
            Pageable pageable
    ) {
        QCustomerInquiry customerInquiry = QCustomerInquiry.customerInquiry;

        List<CustomerInquiry> content = queryFactory
                .selectFrom(customerInquiry)
                .where(
                        sourceEq(source),
                        categoryEq(category),
                        statusEq(status),
                        contentContains(contentKeyword),
                        createdAtBetween(startDateTime, endDateTime)
                )
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(customerInquiry.createdAt.desc())
                .fetch();

        JPAQuery<Long> countQuery = queryFactory
                .select(customerInquiry.count())
                .from(customerInquiry)
                .where(
                        sourceEq(source),
                        categoryEq(category),
                        statusEq(status),
                        contentContains(contentKeyword),
                        createdAtBetween(startDateTime, endDateTime)
                );

        return PageableExecutionUtils.getPage(content, pageable, countQuery::fetchOne);
    }

    private BooleanExpression sourceEq(String source) {
        return StringUtils.hasText(source) ? QCustomerInquiry.customerInquiry.source.eq(source) : null;
    }

    private BooleanExpression categoryEq(String category) {
        return StringUtils.hasText(category) ? QCustomerInquiry.customerInquiry.category.eq(category) : null;
    }

    private BooleanExpression statusEq(CustomerInquiry.Status status) {
        return status != null ? QCustomerInquiry.customerInquiry.status.eq(status) : null;
    }

    private BooleanExpression contentContains(String keyword) {
        return StringUtils.hasText(keyword) ? QCustomerInquiry.customerInquiry.contents.contains(keyword) : null;
    }

    private BooleanExpression createdAtBetween(OffsetDateTime start, OffsetDateTime end) {
        if (start != null && end != null) {
            return QCustomerInquiry.customerInquiry.createdAt.between(start, end);
        } else if (start != null) {
            return QCustomerInquiry.customerInquiry.createdAt.goe(start);
        } else if (end != null) {
            return QCustomerInquiry.customerInquiry.createdAt.loe(end);
        }
        return null;
    }
}
