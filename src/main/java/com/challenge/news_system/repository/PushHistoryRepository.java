package com.challenge.news_system.repository;

import com.challenge.news_system.entity.PushHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PushHistoryRepository extends JpaRepository<PushHistory, Long> {

    List<PushHistory> findAllByOrderBySentAtDesc();
}
