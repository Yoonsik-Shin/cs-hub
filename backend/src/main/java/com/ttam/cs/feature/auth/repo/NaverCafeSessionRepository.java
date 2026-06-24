package com.ttam.cs.feature.auth.repo;

import com.ttam.cs.feature.auth.domain.NaverCafeSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NaverCafeSessionRepository extends JpaRepository<NaverCafeSession, String> {
}
