package com.challenge.news_system.service;

import java.util.Random;
import org.springframework.stereotype.Service;

@Service
public class PushNotificationServiceImpl implements PushNotificationService {
    private static final Random random = new Random();

    @Override
    public String sendAPNS(String device_id, String article_id, String title) {
        try {
            // APNS API 호출 로직 작성
            return random.nextBoolean() ? "success" : "fail";
        } catch (Exception e) {
            return "fail";
        }
    }

    @Override
    public String sendFCM(String device_id, String article_id, String title) {
        try {
            // FCM API 호출 로직 작성
            return random.nextBoolean() ? "success" : "fail";
        } catch (Exception e) {
            return "fail";
        }
    }
}
