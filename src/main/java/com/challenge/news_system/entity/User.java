package com.challenge.news_system.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    private Long id; // 과제 2: 사용자 CSV의 No 값

    @Column(nullable = false)
    private String name;

    @Column(name = "device_id", nullable = false, length = 500)
    private String deviceId;

    @Column(name = "push_type", nullable = false, length = 10)
    private String pushType; // 과제 2: APNs 또는 FCM

    @Column(nullable = false, length = 200)
    private String categories; // 과제 2: 사용자가 구독한 카테고리 목록

    @Column(name = "dnd_time", nullable = false, length = 20)
    private String dndTime; // 과제 2: 푸시 금지 시간대 또는 미설정("-")
}
