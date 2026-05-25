package com.challenge.news_system.repository;

import com.challenge.news_system.entity.PushHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PushHistoryRepository extends JpaRepository<PushHistory, Long> {

    Page<PushHistory> findAllByOrderBySentAtDesc(Pageable pageable);

    // 과제 2: 발송 실패하여 아직 처리가 끝나지 않은(재시도 대상) 이력 조회
    List<PushHistory> findByStatusAndIsCompletedFalse(String status);
}


