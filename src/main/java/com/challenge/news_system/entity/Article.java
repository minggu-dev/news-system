package com.challenge.news_system.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "articles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Article {

    @Id
    @Column(name = "article_id", length = 50)
    private String articleId; // 공통: 기사 원문 링크에서 추출한 고유 ID

    @Column(nullable = false, length = 500)
    private String title;

    @Column(nullable = false, length = 1000)
    private String link;

    @Column(name = "dc_creator", length = 100)
    private String dcCreator; // 공통: RSS dc:creator에서 가져온 작성자명

    @Column(name = "pub_date", length = 50)
    private String pubDate; // 공통: RSS 원본 발행 시각 문자열

    @Column(name = "parsed_pub_date")
    private LocalDateTime parsedPubDate; // 공통: 정렬 및 1,000건 보관 정책에 사용하는 발행 시각

    @Column(name = "image_url", length = 500)
    private String imageUrl; // 과제 1: 기사 목록 썸네일 URL

    @Column(nullable = false, length = 20)
    private String category; // 공통: 기사 카테고리

    @Builder.Default
    @Column(name = "is_read", nullable = false)
    private boolean isRead = false; // 과제 1: 기사 읽음/안 읽음 상태
}
