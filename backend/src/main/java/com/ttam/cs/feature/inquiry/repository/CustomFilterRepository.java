package com.ttam.cs.feature.inquiry.repository;

import com.ttam.cs.feature.inquiry.domain.entity.CustomFilter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomFilterRepository extends JpaRepository<CustomFilter, Long> {
    List<CustomFilter> findByOperatorIdOrderByIdDesc(String operatorId);
    Optional<CustomFilter> findByOperatorIdAndId(String operatorId, Long id);
    Optional<CustomFilter> findByOperatorIdAndName(String operatorId, String name);
    boolean existsByOperatorIdAndName(String operatorId, String name);
}
