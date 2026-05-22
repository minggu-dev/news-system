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
    private String pushType; // APNS or FCM

    @Column(name = "article_title", nullable = false, length = 500)
    private String articleTitle;

    @Column(name = "article_category", nullable = false, length = 20)
    private String articleCategory;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    @Column(nullable = false, length = 10)
    private String status; // success or fail
}
