package com.ttam.cs.feature.auth.repository;

import com.ttam.cs.feature.auth.domain.AdminMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * {@link AdminMember} 엔티티 조회를 위한 Spring Data JPA 리포지토리입니다.
 */
@Repository
public interface AdminMemberRepository extends JpaRepository<AdminMember, String> {
}
