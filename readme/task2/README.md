# 과제 2. 뉴스 기사 푸시 전송 백엔드 시스템

## 1. 과제 목표

가상 사용자의 구독 정보 및 방해 금지 시간(DND)에 기초하여, 실시간 RSS 수집 기사와 매칭해 맞춤형 모의 푸시 알림(APNs/FCM)을 발송하고, 안정적 전송을 위한 **SQLite DB 영속 기반 재시도 스케줄러**를 완비한 백엔드 알림 전달 시스템을 구현했습니다.

과제 요구사항에 맞춰 다음 기능을 제공합니다.

- CSV 기반 가상 사용자 데이터 초기 적재 (Seed)
- 10분 주기 실시간 RSS 기사 수집 및 타겟 매칭
- 자정 교차 계산이 포함된 DND(방해 금지 시간대) 예외 필터링
- 사용자 기기(APNs/FCM)별 모의 발송 시뮬레이션 및 실패 코드 세분화
- DB 영속 상태 기반 재시도 스케줄러
- 푸시 발송 이력 실시간 모니터링 및 페이징 대시보드
- 가상 사용자 100인의 상세 정보 및 DND 설정 상태 확인 뷰

## 2. 화면 흐름 및 상태 전이

```text
       신규 기사 수집 (10분 주기)
                 ↓
      구독 카테고리 매칭 검사
                 ↓
     DND(방해 금지 시간대) 필터링 (스킵 시 DND 건수 누적)
                 ↓
        [첫 번째 발송 시도] ───────> (성공) ──> status = 'success', isCompleted = true
                 ↓
               (실패) 
                 ├─────────> (재시도 불가 영구 오류) ──> status = 'fail', isCompleted = true
                 └─────────> (재시도 가능 일시 오류) ──> status = 'fail', isCompleted = false, retryCount = 0 (UI: 1/3)
                                                               ↓
                                                [1분 주기 재시도 스케줄러 작동]
                                                               ↓
                                                재발송 시도 (최대 3회 배치 루프 처리)
                                                               ├─> (성공) ──> status = 'success', isCompleted = true
                                                               └─> (3회 시도 초과 또는 영구 오류 전환) ──> status = 'fail', isCompleted = true
```

## 3. 주요 기능 구현

### 3.1 가상 사용자 데이터 초기 적재 (Seed)

서버 최초 실행 시 데이터베이스에 가상 사용자 데이터가 없는 경우 설정된 CSV 파일로부터 데이터를 파싱하여 데이터베이스에 자동으로 적재합니다.

적재 정보:

- 사용자 ID
- 이름
- 기기 고유 ID
- 푸시 타입 (APNs/FCM)
- 선호 카테고리 (콤마 구분)
- 방해 금지 시간대 (DND)

관련 파일:

- `src/main/resources/users.csv`
- `src/main/java/com/challenge/news_system/config/DatabaseInitializer.java`

### 3.2 RSS 기사 수집 및 매칭

서버 실행 중 10분 간격으로 연합뉴스 RSS 피드를 자동으로 조회하며, 새로 수집된 기사의 카테고리와 가상 사용자의 구독 관심 카테고리를 비교하여 알림 발송 대상을 매칭합니다.

관련 구현 위치:

- `src/main/java/com/challenge/news_system/service/NewsRssScheduler.java`
- `scheduleRssPull()`: 10분 주기로 자동 실행되는 RSS 수집 및 푸시 매칭 메서드
- `pullAndProcessRss()`: RSS 데이터를 파싱하고 기사별 푸시 전송 대상자를 매칭하여 이력을 생성하는 로직

### 3.3 자정 크로싱을 고려한 DND 검증 알고리즘

사용자가 설정한 방해 금지 시간대(DND)에 현재 시각이 포함되는지 판별합니다. 특히 DND 시간대가 자정을 넘어가는 케이스(예: `23:00-08:00`)와 같은 날 안에서 끝나는 케이스(예: `09:00-18:00`)를 분기하여 정확하게 현재 시간과의 중복 여부를 계산합니다. DND에 해당하는 경우 발송을 즉시 건너뛰고 누적 통계에 반영합니다.

관련 구현 위치:

- `src/main/java/com/challenge/news_system/service/NewsRssScheduler.java`
- `isTimeInDnd()`: 자정 교차가 포함된 DND 시간 중첩 여부 판단 로직

### 3.4 디바이스 유형별 모의 발송 및 실패 사유 세분화

사용자의 푸시 타입에 따라 APNs와 FCM으로 분기하여 모의 전송을 수행합니다. 전송 실패 시 실제 환경에서 발생하는 구체적인 오류 코드를 시뮬레이션하여 반환합니다.

오류 코드 분류:

- APNs 오류: `BadDeviceToken`, `Unregistered`, `DeviceTokenNotForTopic`, `ExpiredProviderToken`
- FCM 오류: `InvalidRegistration`, `Unavailable`, `InternalServerError`, `DeviceMessageRateLimitExceeded`

관련 파일:

- `src/main/java/com/challenge/news_system/service/PushNotificationServiceImpl.java`

### 3.5 DB 영속 상태 기반 재시도 스케줄러 (Batch)

기존에 합의된 `"success"`, `"fail"` 상태 규격을 유지하면서, 백그라운드 스케줄러를 통해 안전하게 실패 건을 재전송합니다. 1분 주기로 실행되며, 대기 중인 모든 미결 실패 건들을 조회하여 내부적으로 500개 단위의 배치 반복문으로 나누어 최대 3회까지 순차적으로 재시도합니다. 재시도 대기 상태가 DB에 영속화되므로 서버 재시작 시에도 유실 없이 이어서 진행됩니다.

관련 구현 위치:

- `src/main/java/com/challenge/news_system/service/NewsRssScheduler.java`
- `retryFailedPushes()`: 1분 주기로 미완료 실패 건들을 한 번에 로드하고, 500개 단위 배치 반복 루프로 재발송을 수행하는 스케줄러 메서드
- `src/main/java/com/challenge/news_system/repository/PushHistoryRepository.java`
- `findByStatusAndIsCompletedFalse()`: 재시도 대상 전체를 조회하기 위한 Repository 메서드

### 3.6 푸시 발송 이력 모니터링 및 실시간 UI 3단계 애니메이션

발송 결과를 사용자가 직관적으로 인지할 수 있도록 실시간 상태에 따라 3단계 시각화 피드백을 적용했습니다. 또한, 영어로 정의된 각 플랫폼별 오류 코드를 친절한 한국어 메시지로 변환하여 보여줍니다.

표시 단계:

- 성공 (`success`): 초록색 `성공` 배지 표시
- 재시도 중 (`fail` 이면서 `isCompleted`가 `false`): 주황색 스피닝 로딩 애니메이션과 함께 `재시도 중 (X/3)` 배지 표시 (최초 실패 시 1/3으로 시작하여, 2차/3차 재시도 차례에 따라 수치 증가)
- 최종 실패 (`fail` 이면서 `isCompleted`가 `true`): 빨간색 `실패` 배지 및 에러 번역 메시지 표시

관련 파일:

- `frontend/src/App.jsx`

## 4. 프론트엔드 컴포넌트 구조

주요 UI 및 테이블 조작은 다음 컴포넌트들을 활용해 구현되었습니다.

| 파일 | 역할 |
| :--- | :--- |
| `frontend/src/App.jsx` | 푸시 발송 이력 및 가상 사용자 모니터링 화면 구현, 3단계 결과 뱃지(성공/재시도 중/최종 실패) 및 에러 한글 번역 맵 내장 |
| `frontend/src/components/PaginationBar.jsx` | 발송 이력 및 가상 사용자 리스트에 공통 적용된 페이지 네비게이션 컴포넌트 |

## 5. 백엔드 구현

### User Entity

CSV 파일로부터 세딩된 가상 사용자 정보는 `users` 테이블에 저장됩니다.

주요 필드:

- `id`: 사용자 ID (No 값)
- `name`: 사용자 이름
- `deviceId`: 기기 고유 ID (토큰)
- `pushType`: 푸시 타입 (`APNs` 또는 `FCM`)
- `categories`: 구독 관심 카테고리 목록 (콤마 구분)
- `dndTime`: 방해 금지 시간대 또는 미설정 (`-`)

### PushHistory Entity

알림 발송 및 백오프 재시도 이력 정보는 `push_history` 테이블에 영속화됩니다.

주요 필드:

- `id`: 발송 이력 고유 일련번호
- `deviceId`: 수신 기기 고유 ID
- `pushType`: 푸시 타입 (`APNs` 또는 `FCM`)
- `articleTitle`: 전송된 기사 제목
- `articleCategory`: 전송된 기사 카테고리
- `sentAt`: 전송 및 재시도 실행 시각
- `status`: 전송 결과 상태값 (`success` 또는 `fail` 2가지 스펙 엄격 유지)
- `failReason`: 발송 실패 사유 상세 오류 코드 (APNs/FCM 오류 코드 원형 보존)
- `isCompleted`: 해당 알림 발송건의 최종 완료(성공 혹은 최대재시도 완료) 여부
- `retryCount`: 누적 재시도 실행 횟수 (0 ~ 3)

### UserRepository

SQLite DB 상의 전체 가상 유저 정보를 로드합니다.

### PushHistoryRepository

발송 이력을 최신 시각순으로 정렬 조회하는 페이징 기능 및 아직 완료되지 않은 재시도 대상 조회를 지원합니다.

지원 메서드:

- `findAllByOrderBySentAtDesc()`: 발송 이력 페이지 조회
- `findByStatusAndIsCompletedFalse()`: 재시도 대상 목록 조회

### PushNotificationService

사용자 기기 타입에 맞춰 분기 전송하며, APNs/FCM 규격에 맞는 실제 오류 코드를 랜덤 반환하는 시뮬레이션 구현체입니다.

### NewsRssScheduler

주기적인 백그라운드 작업을 실행하는 스케줄러입니다.

주요 스케줄러:

- `scheduleRssPull()`: 10분 주기 RSS 수집 및 카테고리 매칭
- `retryFailedPushes()`: 1분 주기 미결 실패 건 전체 로드 후 500개 단위 배치 반복 재시도 수행

## 6. 확인 방법

애플리케이션 실행 후 브라우저에서 접속합니다.

```text
http://localhost:8080
```

확인 순서:

1. `푸시 발송 이력` 또는 `사용자 정보` 탭을 선택합니다.
2. `사용자 정보` 탭에서 엑셀(CSV) 기반으로 세딩된 100명의 사용자 리스트와 DND 시간 설정 상태를 확인합니다.
3. 우상단의 **"RSS 즉시 수집 & 푸시 시뮬레이션"** 버튼을 눌러 발송 프로세스를 즉시 구동합니다.
4. 모의 푸시가 트리거된 후 수집된 총 건수와 DND 제외 건수, 성공/실패 여부를 모달에서 요약 확인합니다.
5. `푸시 발송 이력` 테이블에서 실패 건들이 주황색 **`재시도 중 (1/3)`** 뱃지와 함께 실시간 회전 애니메이션으로 표시되는지 관찰합니다.
6. 1분 대기 후, 백그라운드 스케줄러가 돌아 해당 내역이 점진적으로 `성공` 또는 `실패`로 안전하게 전이 및 수렴하는지 확인합니다.
7. 서버 로그 콘솔 또는 `logs/spring.log` 파일을 열어 백그라운드 재시도 과정을 디버깅 추적하여 최종 검증합니다.
