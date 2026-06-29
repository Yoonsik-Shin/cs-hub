package com.ttam.cs.feature.inquiry.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@Entity
@Table(name = "custom_filter", uniqueConstraints = {
        @UniqueConstraint(name = "uq_operator_filter_name", columnNames = {"operator_id", "name"})
})
public class CustomFilter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "operator_id", nullable = false, length = 50)
    private String operatorId;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "filter_data", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> filterData;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public static CustomFilter create(String operatorId, String name, Map<String, Object> filterData) {
        return CustomFilter.builder()
                .operatorId(operatorId)
                .name(name)
                .filterData(filterData)
                .build();
    }

    public void updateFilterData(Map<String, Object> filterData) {
        this.filterData = filterData;
    }
}
