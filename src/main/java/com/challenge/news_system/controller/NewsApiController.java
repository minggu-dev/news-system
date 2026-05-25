package com.challenge.news_system.controller;

import com.challenge.news_system.entity.Article;
import com.challenge.news_system.entity.PushHistory;
import com.challenge.news_system.entity.User;
import com.challenge.news_system.repository.ArticleRepository;
import com.challenge.news_system.repository.PushHistoryRepository;
import com.challenge.news_system.repository.UserRepository;
import com.challenge.news_system.service.NewsRssScheduler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*") // 공통: 로컬 프론트엔드와 API 통신 시 CORS 오류를 방지
public class NewsApiController {

    private final ArticleRepository articleRepository;
    private final PushHistoryRepository pushHistoryRepository;
    private final UserRepository userRepository;
    private final NewsRssScheduler newsRssScheduler;

    /**
     * 과제 1: 기사 열람 화면에서 사용할 뉴스 카테고리 목록을 조회합니다.
     */
    @GetMapping("/categories")
    public ResponseEntity<List<String>> getCategories() {
        return ResponseEntity.ok(List.of("정치", "북한", "경제", "산업", "사회"));
    }

    /**
     * 과제 1: 기사 목록을 카테고리, 검색어, 페이지 조건으로 조회합니다.
     */
    @GetMapping("/articles")
    public ResponseEntity<Page<Article>> getArticles(
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(safePage, safeSize);
        String categoryFilter = category == null || category.trim().isEmpty() ? null : category.trim();
        String searchFilter = search == null || search.trim().isEmpty() ? null : search.trim();

        return ResponseEntity.ok(articleRepository.searchArticles(categoryFilter, searchFilter, pageable));
    }

    /**
     * 과제 1: 사용자가 열람한 기사를 읽음 상태로 변경합니다.
     */
    @PostMapping("/articles/{articleId}/read")
    public ResponseEntity<Article> markAsRead(@PathVariable("articleId") String articleId) {
        return articleRepository.findById(articleId)
                .map(article -> {
                    article.setRead(true);
                    Article saved = articleRepository.save(article);
                    log.info("Article {} marked as read.", articleId);
                    return ResponseEntity.ok(saved);
                })
                .orElseGet(() -> {
                    log.warn("Article with ID {} not found.", articleId);
                    return ResponseEntity.notFound().build();
                });
    }

    /**
     * 과제 2: 푸시 발송 이력을 페이지 단위로 조회합니다.
     */
    @GetMapping("/push-history")
    public ResponseEntity<Page<PushHistory>> getPushHistory(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(pushHistoryRepository.findAllByOrderBySentAtDesc(pageable));
    }

    /**
     * 과제 2: CSV에서 초기 적재한 사용자 목록을 조회합니다.
     */
    @GetMapping("/users")
    public ResponseEntity<List<User>> getUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    /**
     * 공통: 스케줄러에 등록된 RSS 수집 및 푸시 매칭 로직을 수동으로 실행합니다.
     */
    @PostMapping("/trigger-scheduler")
    public ResponseEntity<Map<String, Object>> triggerScheduler() {
        log.info("Manual RSS scheduler pull triggered via REST API.");
        Map<String, Object> summary = newsRssScheduler.pullAndProcessRss();
        return ResponseEntity.ok(summary);
    }
}
