package com.challenge.news_system.repository;

import com.challenge.news_system.entity.Article;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface ArticleRepository extends JpaRepository<Article, String> {

    List<Article> findByCategoryOrderByParsedPubDateDesc(String category);

    List<Article> findAllByOrderByParsedPubDateDesc();

    // Find the oldest articles to delete when count > 1000
    List<Article> findAllByOrderByParsedPubDateAsc();
}
