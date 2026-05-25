package com.challenge.news_system.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@Table(name = "push_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PushHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_id", nullable = false, length = 500)
    private String deviceId;

    @Column(name = "push_type", nullable = false, length = 10)
    private String pushType; // 과제 2: APNs 또는 FCM

    @Column(name = "article_title", nullable = false, length = 500)
    private String articleTitle;

    @Column(name = "article_category", nullable = false, length = 20)
    private String articleCategory;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    @Column(nullable = false, length = 10)
    private String status; // 과제 2: 푸시 발송 결과(success 또는 fail)

    @Column(name = "fail_reason", length = 100)
    private String failReason; // 과제 2: 푸시 발송 실패 사유

    @Builder.Default
    @Column(name = "is_completed", nullable = false)
    @JsonProperty("isCompleted")
    private boolean isCompleted = false; // 과제 2: 발송 작업 최종 완료 여부

    @Builder.Default
    @Column(name = "retry_count", nullable = false)
    private int retryCount = 0; // 과제 2: 푸시 발송 재시도 횟수
}


