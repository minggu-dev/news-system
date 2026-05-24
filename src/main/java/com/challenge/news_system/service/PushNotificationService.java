package com.challenge.news_system.service;

/** PushNotificationService 인터페이스 */
public interface PushNotificationService {
    /**
     * APNS를 통해 iOS 사용자에게 푸시 알림 발송
     * @param device_id iOS 사용자 기기 고유 아이디
     * @param article_id 발송할 기사의 고유 아이디
     * @param title 기사 제목
     * @return "success" 또는 "fail" (랜덤 반환)
     */
    String sendAPNS(String device_id, String article_id, String title);

    /**
     * FCM을 통해 Android 사용자에게 푸시 알림 발송
     * @param device_id Android 사용자 기기 고유 아이디
     * @param article_id 발송할 기사의 고유 아이디
     * @param title 기사 제목
     * @return "success" 또는 "fail" (랜덤 반환)
     */
    String sendFCM(String device_id, String article_id, String title);
}
