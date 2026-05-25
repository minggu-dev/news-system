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

    // 공통: 연합뉴스 카테고리별 RSS 피드 주소입니다.
    private static final Map<String, String> RSS_FEEDS = Map.of(
            "정치", "https://www.yna.co.kr/rss/politics.xml",
            "북한", "https://www.yna.co.kr/rss/northkorea.xml",
            "경제", "https://www.yna.co.kr/rss/economy.xml",
            "산업", "https://www.yna.co.kr/rss/industry.xml",
            "사회", "https://www.yna.co.kr/rss/society.xml"
    );

    // 공통: 서버 실행 중 10분마다 RSS 수집 로직을 자동 실행합니다.
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
     * 공통: RSS 피드를 수집하고 신규 기사를 저장한 뒤 처리 결과를 반환합니다.
     * 과제 2: 신규 기사에 대해서는 사용자 매칭과 푸시 발송 이력 저장까지 함께 수행합니다.
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

                List<String> parsedArticleIds = new ArrayList<>();
                for (Article article : parsed) {
                    parsedArticleIds.add(article.getArticleId());
                }

                Map<String, Article> existingArticleById = new HashMap<>();
                for (Article existing : articleRepository.findAllById(parsedArticleIds)) {
                    existingArticleById.put(existing.getArticleId(), existing);
                }

                List<Article> articlesToSave = new ArrayList<>();
                Set<String> newArticleIds = new HashSet<>();

                for (Article article : parsed) {
                    Article existing = existingArticleById.get(article.getArticleId());
                    if (existing != null) {
                        continue;
                    }
                    if (newArticleIds.add(article.getArticleId())) {
                        articlesToSave.add(article);
                    }
                }

                if (!articlesToSave.isEmpty()) {
                    newArticles.addAll(articleRepository.saveAll(articlesToSave));
                }
            } catch (Exception e) {
                log.error("Failed to process feed for category: {}. Skipping this feed.", category, e);
            }
        }

        log.info("RSS Pull finished. Parsed: {}, Newly Saved: {}", totalProcessed, newArticles.size());

        // 과제 2: 신규 기사에 대해 사용자 관심 카테고리와 DND 시간을 기준으로 푸시 발송 대상을 매칭합니다.
        int pushesSent = 0;
        int pushesSkippedDnd = 0;
        if (!newArticles.isEmpty()) {
            Map<String, Integer> pushResult = matchAndSendPushes(newArticles);
            pushesSent = pushResult.getOrDefault("sent", 0);
            pushesSkippedDnd = pushResult.getOrDefault("skippedDnd", 0);
        }

        // 공통: 기사 데이터가 1,000건을 넘으면 오래된 기사부터 정리합니다.
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
            factory.setCoalescing(true); // 공통: CDATA 섹션을 일반 텍스트 노드로 병합합니다.
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
                        dcCreator = getElementValue(element, "creator"); // 공통: dc:creator가 없을 때 creator 태그를 보조로 사용합니다.
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
                        mediaList = element.getElementsByTagName("content"); // 과제 1: media:content가 없을 때 content 태그를 보조로 사용합니다.
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
            // 공통: RSS pubDate의 RFC 1123 형식을 우선 파싱합니다.
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
                // 과제 2: 사용자가 해당 기사 카테고리를 구독했는지 확인합니다.
                if (isUserSubscribed(user, article.getCategory())) {
                    // 과제 2: 사용자의 푸시 금지 시간대에 해당하는지 확인합니다.
                    if (isTimeInDnd(nowTime, user.getDndTime())) {
                        skippedDnd++;
                        log.debug("Skipping push to user {} (ID: {}) due to DND hours: {}", user.getName(), user.getId(), user.getDndTime());
                        continue;
                    }

                    // 과제 2: 사용자 기기 유형에 맞춰 푸시 발송을 시도합니다.
                    String response;
                    if ("APNs".equalsIgnoreCase(user.getPushType())) {
                        response = pushNotificationService.sendAPNS(user.getDeviceId(), article.getArticleId(), article.getTitle());
                    } else {
                        response = pushNotificationService.sendFCM(user.getDeviceId(), article.getArticleId(), article.getTitle());
                    }

                    String status = "success";
                    String failReason = null;
                    boolean isCompleted = true;
                    int retryCount = 0;

                    if (response != null && response.startsWith("fail:")) {
                        status = "fail";
                        failReason = response.substring(5); // "fail:" 이후의 실패 사유 추출
                        if (isRetryableError(failReason)) {
                            isCompleted = false;
                            retryCount = 1;
                        }
                    } else if (!"success".equalsIgnoreCase(response)) {
                        status = "fail";
                        failReason = (response != null) ? response : "Unknown";
                        isCompleted = false;
                        retryCount = 1;
                    }

                    historyList.add(PushHistory.builder()
                            .deviceId(user.getDeviceId())
                            .pushType(user.getPushType())
                            .articleTitle(article.getTitle())
                            .articleCategory(article.getCategory())
                            .sentAt(LocalDateTime.now())
                            .status(status)
                            .failReason(failReason)
                            .isCompleted(isCompleted)
                            .retryCount(retryCount)
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

    // 과제 2: 1분마다 발송 실패한 재시도 대상(status='fail', isCompleted=false)을 모아 재발송을 시도합니다.
    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void retryFailedPushes() {
        List<PushHistory> pendingRetries = pushHistoryRepository.findByStatusAndIsCompletedFalse("fail");
        if (pendingRetries.isEmpty()) {
            return;
        }

        log.info("Found {} failed pushes pending retry...", pendingRetries.size());
        for (PushHistory history : pendingRetries) {
            log.info("Retrying push history ID: {} (Attempt {}/3)", history.getId(), history.getRetryCount() + 1);
            
            String response;
            if ("APNs".equalsIgnoreCase(history.getPushType())) {
                response = pushNotificationService.sendAPNS(history.getDeviceId(), "RETRY", history.getArticleTitle());
            } else {
                response = pushNotificationService.sendFCM(history.getDeviceId(), "RETRY", history.getArticleTitle());
            }

            int currentAttempt = history.getRetryCount() + 1;
            history.setRetryCount(currentAttempt);
            history.setSentAt(LocalDateTime.now()); // 발송 시각 갱신

            if ("success".equalsIgnoreCase(response)) {
                history.setStatus("success");
                history.setCompleted(true);
                history.setFailReason(null);
                log.info("Push history ID: {} retry successful.", history.getId());
            } else {
                String failReason = "Unknown";
                if (response != null && response.startsWith("fail:")) {
                    failReason = response.substring(5);
                } else if (response != null) {
                    failReason = response;
                }
                history.setFailReason(failReason);

                // 영구 장애로 에러가 바뀌었거나, 재시도 횟수 3회에 도달한 경우 최종 종결
                if (!isRetryableError(failReason) || currentAttempt >= 3) {
                    history.setCompleted(true);
                    log.info("Push history ID: {} retry finalized as fail. (Attempts: {})", history.getId(), currentAttempt);
                } else {
                    log.info("Push history ID: {} retry failed. Will retry again later.", history.getId());
                }
            }
        }
        pushHistoryRepository.saveAll(pendingRetries);
    }

    private boolean isRetryableError(String failReason) {
        if (failReason == null) return true;
        // 재시도 가능한 실패 사유 리스트
        List<String> retryableReasons = List.of(
            "Unavailable", 
            "InternalServerError", 
            "DeviceMessageRateLimitExceeded", 
            "UnknownException", 
            "Unknown"
        );
        return retryableReasons.contains(failReason);
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
                // 과제 2: 자정을 넘어가는 DND 구간입니다. 예: 23:00-11:00
                return now.isAfter(start) || now.equals(start) || now.isBefore(end) || now.equals(end);
            } else {
                // 과제 2: 같은 날짜 안에서 끝나는 DND 구간입니다. 예: 09:00-18:00
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
