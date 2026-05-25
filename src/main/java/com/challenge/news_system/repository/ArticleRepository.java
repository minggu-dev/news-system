package com.challenge.news_system.repository;

import com.challenge.news_system.entity.Article;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ArticleRepository extends JpaRepository<Article, String> {

    List<Article> findByCategoryOrderByParsedPubDateDesc(String category);

    List<Article> findAllByOrderByParsedPubDateDesc();

    Page<Article> findByCategoryOrderByParsedPubDateDesc(String category, Pageable pageable);

    Page<Article> findAllByOrderByParsedPubDateDesc(Pageable pageable);

    @Query("""
            SELECT a
            FROM Article a
            WHERE (:category IS NULL OR a.category = :category)
              AND (
                :search IS NULL
                OR LOWER(a.title) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(COALESCE(a.dcCreator, '')) LIKE LOWER(CONCAT('%', :search, '%'))
              )
            ORDER BY a.parsedPubDate DESC
            """)
    Page<Article> searchArticles(
            @Param("category") String category,
            @Param("search") String search,
            Pageable pageable);

    // Find the oldest articles to delete when count > 1000
    List<Article> findAllByOrderByParsedPubDateAsc();
}
