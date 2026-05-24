package com.challenge.news_system.controller;

import com.challenge.news_system.entity.Article;
import com.challenge.news_system.repository.ArticleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class NewsApiController {

    private final ArticleRepository articleRepository;

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
}
