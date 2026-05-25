package com.challenge.news_system.service;

import com.challenge.news_system.entity.Article;
import com.challenge.news_system.entity.PushHistory;
import com.challenge.news_system.entity.User;
import com.challenge.news_system.repository.ArticleRepository;
import com.challenge.news_system.repository.PushHistoryRepository;
import com.challenge.news_system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class NewsRssScheduler {

    private final ArticleRepository articleRepository;
    private final UserRepository userRepository;
    private final PushHistoryRepository pushHistoryRepository;
    private final PushNotificationService pushNotificationService;

    // RSS Feed Map
    private static final Map<String, String> RSS_FEEDS = Map.of(
            "정치", "https://www.yna.co.kr/rss/politics.xml",
            "북한", "https://www.yna.co.kr/rss/northkorea.xml",
            "경제", "https://www.yna.co.kr/rss/economy.xml",
            "산업", "https://www.yna.co.kr/rss/industry.xml",
            "사회", "https://www.yna.co.kr/rss/society.xml"
    );

    // Schedule to run every 10 minutes
    @Scheduled(fixedDelay = 600000)
    public void scheduleRssPull() {
        log.info("Starting scheduled RSS pull...");
        try {
            pullAndProcessRss();
        } catch (Exception e) {
            log.error("Error during scheduled RSS pull", e);
        }
    }

    /**
     * Pulls RSS feeds, saves new articles, triggers push matching, and enforces 1,000-article limits.
     * Returns a processing summary.
     */
    @Transactional
    public Map<String, Object> pullAndProcessRss() {
        List<Article> newArticles = new ArrayList<>();
        int totalProcessed = 0;

        for (Map.Entry<String, String> entry : RSS_FEEDS.entrySet()) {
            String category = entry.getKey();
            String feedUrl = entry.getValue();

            log.info("Fetching feed for {}: {}", category, feedUrl);
            try {
                List<Article> parsed = parseRssFeed(feedUrl, category);
                totalProcessed += parsed.size();

                for (Article article : parsed) {
                    Optional<Article> existingOpt = articleRepository.findById(article.getArticleId());
                    if (existingOpt.isEmpty()) {
                        Article saved = articleRepository.save(article);
                        newArticles.add(saved);
                    } else {
                        Article existing = existingOpt.get();
                        if ("북한".equals(article.getCategory()) && !"북한".equals(existing.getCategory())) {
                            existing.setCategory("북한");
                            articleRepository.save(existing);
                            log.info("Updated category of article {} from {} to 북한", existing.getArticleId(), existing.getCategory());
                        }
                    }
                }
            } catch (Exception e) {
                log.error("Failed to process feed for category: {}. Skipping this feed.", category, e);
            }
        }

        log.info("RSS Pull finished. Parsed: {}, Newly Saved: {}", totalProcessed, newArticles.size());

        // Trigger Push Notification matching for new articles
        int pushesSent = 0;
        int pushesSkippedDnd = 0;
        if (!newArticles.isEmpty()) {
            Map<String, Integer> pushResult = matchAndSendPushes(newArticles);
            pushesSent = pushResult.getOrDefault("sent", 0);
            pushesSkippedDnd = pushResult.getOrDefault("skippedDnd", 0);
        }

        // Enforce 1,000-article database limit
        int deletedCount = enforceArticleRetentionLimit();

        Map<String, Object> summary = new HashMap<>();
        summary.put("timestamp", LocalDateTime.now());
        summary.put("parsedCount", totalProcessed);
        summary.put("newSavedCount", newArticles.size());
        summary.put("pushesSent", pushesSent);
        summary.put("pushesSkippedDnd", pushesSkippedDnd);
        summary.put("deletedOldCount", deletedCount);
        return summary;
    }

    private List<Article> parseRssFeed(String urlString, String category) throws Exception {
        List<Article> articles = new ArrayList<>();
        
        URI uri = new URI(urlString);
        URL url = uri.toURL();
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
        conn.setConnectTimeout(5000);
        conn.setReadTimeout(5000);

        try (InputStream is = conn.getInputStream()) {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setCoalescing(true); // Automatically merges CDATA sections into Text nodes
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.parse(is);
            doc.getDocumentElement().normalize();

            NodeList nList = doc.getElementsByTagName("item");
            for (int i = 0; i < nList.getLength(); i++) {
                Node node = nList.item(i);
                if (node.getNodeType() == Node.ELEMENT_NODE) {
                    Element element = (Element) node;
                    
                    String title = getElementValue(element, "title");
                    String link = getElementValue(element, "link");
                    String dcCreator = getElementValue(element, "dc:creator");
                    if (dcCreator == null) {
                        dcCreator = getElementValue(element, "creator"); // fallback
                    }
                    String pubDate = getElementValue(element, "pubDate");

                    if (title == null || link == null) {
                        continue;
                    }

                    String articleId = extractArticleId(link);
                    if (articleId == null) {
                        continue;
                    }

                    LocalDateTime parsedPubDate = parsePubDate(pubDate);

                    String imageUrl = null;
                    NodeList mediaList = element.getElementsByTagName("media:content");
                    if (mediaList == null || mediaList.getLength() == 0) {
                        mediaList = element.getElementsByTagName("content"); // fallback
                    }
                    if (mediaList != null && mediaList.getLength() > 0) {
                        Element mediaElement = (Element) mediaList.item(0);
                        imageUrl = mediaElement.getAttribute("url");
                        if (imageUrl != null && imageUrl.trim().isEmpty()) {
                            imageUrl = null;
                        }
                    }

                    articles.add(Article.builder()
                            .articleId(articleId)
                            .title(title)
                            .link(link)
                            .dcCreator(dcCreator != null ? dcCreator : "연합뉴스")
                            .pubDate(pubDate)
                            .parsedPubDate(parsedPubDate)
                            .category(category)
                            .imageUrl(imageUrl)
                            .isRead(false)
                            .build());
                }
            }
        } finally {
            conn.disconnect();
        }

        return articles;
    }

    private String getElementValue(Element parent, String tagName) {
        NodeList nodeList = parent.getElementsByTagName(tagName);
        if (nodeList != null && nodeList.getLength() > 0) {
            Node node = nodeList.item(0);
            return node.getTextContent();
        }
        return null;
    }

    private String extractArticleId(String link) {
        if (link == null || link.trim().isEmpty()) {
            return null;
        }
        String trimmed = link.trim();
        int questionMark = trimmed.indexOf('?');
        if (questionMark != -1) {
            trimmed = trimmed.substring(0, questionMark);
        }
        if (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        int lastSlash = trimmed.lastIndexOf('/');
        if (lastSlash != -1) {
            return trimmed.substring(lastSlash + 1);
        }
        return trimmed;
    }

    private LocalDateTime parsePubDate(String pubDateStr) {
        if (pubDateStr == null || pubDateStr.trim().isEmpty()) {
            return LocalDateTime.now();
        }
        try {
            // RFC 1123 format (e.g. "Mon, 18 May 2026 14:42:49 +0900")
            return ZonedDateTime.parse(pubDateStr, DateTimeFormatter.RFC_1123_DATE_TIME).toLocalDateTime();
        } catch (Exception e) {
            try {
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("EEE, dd MMM yyyy HH:mm:ss Z", Locale.ENGLISH);
                return ZonedDateTime.parse(pubDateStr, formatter).toLocalDateTime();
            } catch (Exception ex) {
                log.warn("Failed to parse pubDate: '{}'. Defaulting to current time.", pubDateStr, ex);
                return LocalDateTime.now();
            }
        }
    }

    private Map<String, Integer> matchAndSendPushes(List<Article> articles) {
        List<User> users = userRepository.findAll();
        int sent = 0;
        int skippedDnd = 0;
        LocalTime nowTime = LocalTime.now();

        List<PushHistory> historyList = new ArrayList<>();

        for (Article article : articles) {
            for (User user : users) {
                // Check if user is interested in this article's category
                if (isUserSubscribed(user, article.getCategory())) {
                    // Check DND Hour
                    if (isTimeInDnd(nowTime, user.getDndTime())) {
                        skippedDnd++;
                        log.debug("Skipping push to user {} (ID: {}) due to DND hours: {}", user.getName(), user.getId(), user.getDndTime());
                        continue;
                    }

                    // Attempt send push
                    String status;
                    if ("APNs".equalsIgnoreCase(user.getPushType())) {
                        status = pushNotificationService.sendAPNS(user.getDeviceId(), article.getArticleId(), article.getTitle());
                    } else {
                        status = pushNotificationService.sendFCM(user.getDeviceId(), article.getArticleId(), article.getTitle());
                    }

                    historyList.add(PushHistory.builder()
                            .deviceId(user.getDeviceId())
                            .pushType(user.getPushType())
                            .articleTitle(article.getTitle())
                            .articleCategory(article.getCategory())
                            .sentAt(LocalDateTime.now())
                            .status(status)
                            .build());
                    sent++;
                }
            }
        }

        if (!historyList.isEmpty()) {
            pushHistoryRepository.saveAll(historyList);
            log.info("Saved {} notification dispatch history logs to SQLite.", historyList.size());
        }

        Map<String, Integer> result = new HashMap<>();
        result.put("sent", sent);
        result.put("skippedDnd", skippedDnd);
        return result;
    }

    private boolean isUserSubscribed(User user, String category) {
        if (user.getCategories() == null) return false;
        String[] cats = user.getCategories().split(",");
        for (String c : cats) {
            if (c.trim().equalsIgnoreCase(category.trim())) {
                return true;
            }
        }
        return false;
    }

    public boolean isTimeInDnd(LocalTime now, String dndTimeStr) {
        if (dndTimeStr == null || dndTimeStr.equals("-") || dndTimeStr.trim().isEmpty()) {
            return false;
        }
        try {
            String[] parts = dndTimeStr.split("-");
            if (parts.length != 2) return false;
            LocalTime start = LocalTime.parse(parts[0].trim());
            LocalTime end = LocalTime.parse(parts[1].trim());

            if (start.isAfter(end)) {
                // Spans midnight (e.g. 23:00-11:00)
                return now.isAfter(start) || now.equals(start) || now.isBefore(end) || now.equals(end);
            } else {
                // Normal same day (e.g. 09:00-18:00)
                return (now.isAfter(start) || now.equals(start)) && (now.isBefore(end) || now.equals(end));
            }
        } catch (Exception e) {
            log.warn("DND parse error for string: {}", dndTimeStr, e);
            return false;
        }
    }

    private int enforceArticleRetentionLimit() {
        long count = articleRepository.count();
        if (count <= 1000) {
            return 0;
        }

        int excess = (int) (count - 1000);
        log.info("Enforcing retention limit: Article count {} exceeds 1,000. Deleting oldest {} articles.", count, excess);

        List<Article> sorted = articleRepository.findAllByOrderByParsedPubDateAsc();
        List<Article> toDelete = sorted.subList(0, Math.min(excess, sorted.size()));
        articleRepository.deleteAll(toDelete);
        
        log.info("Successfully deleted {} oldest articles.", toDelete.size());
        return toDelete.size();
    }

}
