package com.challenge.news_system.service;

import java.util.Random;
import org.springframework.stereotype.Service;

@Service
public class PushNotificationServiceImpl implements PushNotificationService {
    private static final Random random = new Random();

    @Override
    public String sendAPNS(String device_id, String article_id, String title) {
        try {
            // 과제 2: 실제 APNs 연동 대신 발송 결과를 시뮬레이션합니다.
            return random.nextBoolean() ? "success" : "fail";
        } catch (Exception e) {
            return "fail";
        }
    }

    @Override
    public String sendFCM(String device_id, String article_id, String title) {
        try {
            // 과제 2: 실제 FCM 연동 대신 발송 결과를 시뮬레이션합니다.
            return random.nextBoolean() ? "success" : "fail";
        } catch (Exception e) {
            return "fail";
        }
    }
}
