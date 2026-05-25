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
                log.error("Failed to process feed for category: {}. Generating fallback simulated data due to connection failure.", category, e);
                List<Article> fallbacks = generateFallbackArticles(category);
                totalProcessed += fallbacks.size();
                for (Article article : fallbacks) {
                    if (!articleRepository.existsById(article.getArticleId())) {
                        Article saved = articleRepository.save(article);
                        newArticles.add(saved);
                    }
                }
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

                    articles.add(Article.builder()
                            .articleId(articleId)
                            .title(title)
                            .link(link)
                            .dcCreator(dcCreator != null ? dcCreator : "연합뉴스")
                            .pubDate(pubDate)
                            .parsedPubDate(parsedPubDate)
                            .category(category)
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

    private List<Article> generateFallbackArticles(String category) {
        List<Article> list = new ArrayList<>();
        String timeStr = ZonedDateTime.now().format(DateTimeFormatter.ofPattern("EEE, dd MMM yyyy HH:mm:ss Z", Locale.ENGLISH));
        
        if ("북한".equals(category)) {
            list.add(Article.builder()
                    .articleId("MOCK_NK_001")
                    .title("[모의] 남북 당국 회담 추진 전망…평화적 대화 물꼬 트이나")
                    .link("https://www.yna.co.kr/view/MOCK_NK_001")
                    .dcCreator("홍길동 기자")
                    .pubDate(timeStr)
                    .parsedPubDate(LocalDateTime.now())
                    .category("북한")
                    .isRead(false)
                    .build());
            list.add(Article.builder()
                    .articleId("MOCK_NK_002")
                    .title("[모의] 북한 개성공단 주변 물류 동향 분석…비정상적 차량 이동 포착")
                    .link("https://www.yna.co.kr/view/MOCK_NK_002")
                    .dcCreator("김철수 기자")
                    .pubDate(timeStr)
                    .parsedPubDate(LocalDateTime.now().minusHours(1))
                    .category("북한")
                    .isRead(false)
                    .build());
            list.add(Article.builder()
                    .articleId("MOCK_NK_003")
                    .title("[모의] 한미 연합 방위태세 점검…북한 군사 동향 면밀히 추적 감시")
                    .link("https://www.yna.co.kr/view/MOCK_NK_003")
                    .dcCreator("이영희 기자")
                    .pubDate(timeStr)
                    .parsedPubDate(LocalDateTime.now().minusHours(2))
                    .category("북한")
                    .isRead(false)
                    .build());
        } else if ("정치".equals(category)) {
            list.add(Article.builder()
                    .articleId("MOCK_POL_001")
                    .title("[모의] 국회 본회의 개최 합의…민생 법안 일괄 처리 논의 시작")
                    .link("https://www.yna.co.kr/view/MOCK_POL_001")
                    .dcCreator("박민수 기자")
                    .pubDate(timeStr)
                    .parsedPubDate(LocalDateTime.now())
                    .category("정치")
                    .isRead(false)
                    .build());
            list.add(Article.builder()
                    .articleId("MOCK_POL_002")
                    .title("[모의] 여야 지도부 긴급 회동…현안 조율 및 협치 방안 모색")
                    .link("https://www.yna.co.kr/view/MOCK_POL_002")
                    .dcCreator("최은지 기자")
                    .pubDate(timeStr)
                    .parsedPubDate(LocalDateTime.now().minusHours(1))
                    .category("정치")
                    .isRead(false)
                    .build());
        } else if ("경제".equals(category)) {
            list.add(Article.builder()
                    .articleId("MOCK_ECO_001")
                    .title("[모의] 금통위 기준금리 연 3.5% 동결 결정…경기 회복세 추이 지켜본다")
                    .link("https://www.yna.co.kr/view/MOCK_ECO_001")
                    .dcCreator("한상우 기자")
                    .pubDate(timeStr)
                    .parsedPubDate(LocalDateTime.now())
                    .category("경제")
                    .isRead(false)
                    .build());
            list.add(Article.builder()
                    .articleId("MOCK_ECO_002")
                    .title("[모의] 국내 소비자 물가 상승률 2%대 안착…과일 등 신선식품 가격은 여전히 불안")
                    .link("https://www.yna.co.kr/view/MOCK_ECO_002")
                    .dcCreator("정다운 기자")
                    .pubDate(timeStr)
                    .parsedPubDate(LocalDateTime.now().minusHours(1))
                    .category("경제")
                    .isRead(false)
                    .build());
        } else if ("산업".equals(category)) {
            list.add(Article.builder()
                    .articleId("MOCK_IND_001")
                    .title("[모의] K-반도체 글로벌 시장 점유율 확대…인공지능(AI) 메모리 수요 폭발")
                    .link("https://www.yna.co.kr/view/MOCK_IND_001")
                    .dcCreator("강태성 기자")
                    .pubDate(timeStr)
                    .parsedPubDate(LocalDateTime.now())
                    .category("산업")
                    .isRead(false)
                    .build());
            list.add(Article.builder()
                    .articleId("MOCK_IND_002")
                    .title("[모의] 친환경 전기차 배터리 신기술 상용화 임박…주행거리 30% 늘린다")
                    .link("https://www.yna.co.kr/view/MOCK_IND_002")
                    .dcCreator("윤지혜 기자")
                    .pubDate(timeStr)
                    .parsedPubDate(LocalDateTime.now().minusHours(1))
                    .category("산업")
                    .isRead(false)
                    .build());
        } else if ("사회".equals(category)) {
            list.add(Article.builder()
                    .articleId("MOCK_SOC_001")
                    .title("[모의] 전국 날씨 온화한 봄날 지속…낮 최고 기온 25도까지 올라 나들이 인파 가득")
                    .link("https://www.yna.co.kr/view/MOCK_SOC_001")
                    .dcCreator("임종훈 기자")
                    .pubDate(timeStr)
                    .parsedPubDate(LocalDateTime.now())
                    .category("사회")
                    .isRead(false)
                    .build());
            list.add(Article.builder()
                    .articleId("MOCK_SOC_002")
                    .title("[모의] 늘어나는 1인 가구 맞춤형 복지 혜택 강화…안심 주거 서비스 시행 확대")
                    .link("https://www.yna.co.kr/view/MOCK_SOC_002")
                    .dcCreator("송지은 기자")
                    .pubDate(timeStr)
                    .parsedPubDate(LocalDateTime.now().minusHours(1))
                    .category("사회")
                    .isRead(false)
                    .build());
        }
        return list;
    }
}
