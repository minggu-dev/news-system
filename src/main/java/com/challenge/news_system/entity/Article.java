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
    private String articleId; // News ID (extracted from link)

    @Column(nullable = false, length = 500)
    private String title;

    @Column(nullable = false, length = 1000)
    private String link;

    @Column(name = "dc_creator", length = 100)
    private String dcCreator; // Writer name (from dc:creator)

    @Column(name = "pub_date", length = 50)
    private String pubDate; // Original pubDate string

    @Column(name = "parsed_pub_date")
    private LocalDateTime parsedPubDate; // Used for sorting and retention policy (1,000 max)

    @Column(nullable = false, length = 20)
    private String category; // e.g. "정치", "북한", "경제", "산업", "사회"

    @Builder.Default
    @Column(name = "is_read", nullable = false)
    private boolean isRead = false; // Assignment 1: Read/Unread flag
}
