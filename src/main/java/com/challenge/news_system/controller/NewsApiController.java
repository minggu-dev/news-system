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

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*") // Prevent CORS issues when running local React dev servers
public class NewsApiController {

    private final ArticleRepository articleRepository;
    private final PushHistoryRepository pushHistoryRepository;
    private final UserRepository userRepository;
    private final NewsRssScheduler newsRssScheduler;

    /**
     * Get the 5 news categories.
     */
    @GetMapping("/categories")
    public ResponseEntity<List<String>> getCategories() {
        return ResponseEntity.ok(List.of("정치", "북한", "경제", "산업", "사회"));
    }

    /**
     * Get articles. Optional category filter.
     */
    @GetMapping("/articles")
    public ResponseEntity<List<Article>> getArticles(@RequestParam(value = "category", required = false) String category) {
        if (category != null && !category.trim().isEmpty()) {
            return ResponseEntity.ok(articleRepository.findByCategoryOrderByParsedPubDateDesc(category.trim()));
        }
        return ResponseEntity.ok(articleRepository.findAllByOrderByParsedPubDateDesc());
    }

    /**
     * Mark an article as read.
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
     * Get simulated push notification history.
     */
    @GetMapping("/push-history")
    public ResponseEntity<List<PushHistory>> getPushHistory() {
        return ResponseEntity.ok(pushHistoryRepository.findAllByOrderBySentAtDesc());
    }

    /**
     * Get seeded users.
     */
    @GetMapping("/users")
    public ResponseEntity<List<User>> getUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    /**
     * Manually trigger the RSS parsing, deduplication, user matching, and push dispatch process.
     */
    @PostMapping("/trigger-scheduler")
    public ResponseEntity<Map<String, Object>> triggerScheduler() {
        log.info("Manual RSS scheduler pull triggered via REST API.");
        Map<String, Object> summary = newsRssScheduler.pullAndProcessRss();
        return ResponseEntity.ok(summary);
    }
}
