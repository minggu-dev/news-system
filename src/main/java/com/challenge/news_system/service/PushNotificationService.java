package com.challenge.news_system.service;

/** 과제 2: 푸시 발송 처리를 추상화한 인터페이스 */
public interface PushNotificationService {
    /**
     * APNs를 통해 iOS 사용자에게 푸시 알림을 발송합니다.
     *
     * @param device_id iOS 사용자 기기 고유 ID
     * @param article_id 발송할 기사 고유 ID
     * @param title 기사 제목
     * @return 발송 결과(success 또는 fail)
     */
    String sendAPNS(String device_id, String article_id, String title);

    /**
     * FCM을 통해 Android 사용자에게 푸시 알림을 발송합니다.
     *
     * @param device_id Android 사용자 기기 고유 ID
     * @param article_id 발송할 기사 고유 ID
     * @param title 기사 제목
     * @return 발송 결과(success 또는 fail)
     */
    String sendFCM(String device_id, String article_id, String title);
}
