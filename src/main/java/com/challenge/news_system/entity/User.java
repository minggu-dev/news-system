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
    private Long id; // Excel No

    @Column(nullable = false)
    private String name;

    @Column(name = "device_id", nullable = false, length = 500)
    private String deviceId;

    @Column(name = "push_type", nullable = false, length = 10)
    private String pushType; // APNs or FCM

    @Column(nullable = false, length = 200)
    private String categories; // Comma separated, e.g. "정치,경제,사회"

    @Column(name = "dnd_time", nullable = false, length = 20)
    private String dndTime; // e.g. "23:00-11:00" or "-"
}
