package com.challenge.news_system.service;

import java.util.Random;
import org.springframework.stereotype.Service;

@Service
public class PushNotificationServiceImpl implements PushNotificationService {
    private static final Random random = new Random();

    // 과제 2: APNs 모의 발송 실패 시 발생할 수 있는 오류 코드 정의
    private static final String[] APNS_FAIL_REASONS = {
        "BadDeviceToken", "Unregistered", "DeviceTokenNotForTopic", "ExpiredProviderToken"
    };

    // 과제 2: FCM 모의 발송 실패 시 발생할 수 있는 오류 코드 정의
    private static final String[] FCM_FAIL_REASONS = {
        "InvalidRegistration", "Unavailable", "InternalServerError", "DeviceMessageRateLimitExceeded"
    };

    @Override
    public String sendAPNS(String device_id, String article_id, String title) {
        try {
            // 과제 2: 실제 APNs 연동 대신 발송 결과를 시뮬레이션합니다.
            if (random.nextBoolean()) {
                return "success";
            } else {
                String reason = APNS_FAIL_REASONS[random.nextInt(APNS_FAIL_REASONS.length)];
                return "fail:" + reason;
            }
        } catch (Exception e) {
            return "fail:UnknownException";
        }
    }

    @Override
    public String sendFCM(String device_id, String article_id, String title) {
        try {
            // 과제 2: 실제 FCM 연동 대신 발송 결과를 시뮬레이션합니다.
            if (random.nextBoolean()) {
                return "success";
            } else {
                String reason = FCM_FAIL_REASONS[random.nextInt(FCM_FAIL_REASONS.length)];
                return "fail:" + reason;
            }
        } catch (Exception e) {
            return "fail:UnknownException";
        }
    }
}

