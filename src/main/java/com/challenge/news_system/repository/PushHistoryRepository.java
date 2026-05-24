package com.challenge.news_system.repository;

import com.challenge.news_system.entity.PushHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PushHistoryRepository extends JpaRepository<PushHistory, Long> {

    Page<PushHistory> findAllByOrderBySentAtDesc(Pageable pageable);
}

