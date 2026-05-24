# 연합뉴스 IT개발 경력 사전과제 통합 솔루션

본 프로젝트는 연합뉴스 IT개발 경력 사전과제의 **[과제 1] 뉴스 기사 리스트 웹 애플리케이션**과 **[과제 2] 뉴스 기사 푸시 전송 백엔드 시스템**을 하나의 통합 Spring Boot + SQLite + React Gradle 프로젝트로 완벽하게 구현한 솔루션입니다.

---

## 1. 프로젝트 아키텍처 및 설계 특징

### 🛠 기술 스택
- **Backend**: Java 17, Spring Boot 3.5.14, Spring Data JPA, SQLite (Embedded DB)
- **Frontend**: React (Vite), Tailwind CSS v3, Lucide React (Icons)
- **Build Tool**: Gradle (프론트엔드 빌드 및 백엔드 스태틱 리소스 복사 자동화)
- **CI/CD**: Jenkins (`Jenkinsfile` 파이프라인 스크립트 제공)

### 📂 디렉토리 구조
```text
news-system/
├── frontend/                  # React + Vite + Tailwind CSS 프론트엔드 소스
│   ├── src/
│   │   ├── App.jsx            # 메인 뉴스 대시보드 UI (뉴스열람, 발송이력, 사용자목록)
│   │   └── index.css          # Tailwind CSS 스타일 정의
│   ├── tailwind.config.js
│   └── package.json
├── src/main/                  # Spring Boot 백엔드 소스
│   ├── java/com/challenge/news_system/
│   │   ├── config/            # DB 초기화 및 CORS 설정
│   │   ├── controller/        # REST API 컨트롤러
│   │   ├── entity/            # JPA 엔티티 (User, Article, PushHistory)
│   │   ├── repository/        # JPA 리포지토리 인터페이스
│   │   └── service/           # RSS 파싱, DND 검증 및 푸시 알림 발송 서비스
│   └── resources/
│       ├── users.csv          # 100명의 가상 사용자 정보 (Excel 원본 변환 데이터)
│       └── application.properties
├── build.gradle               # 프론트엔드 자동 빌드 및 패키징 스크립트 내장
├── Jenkinsfile                # CI/CD 자동화를 위한 선언적 파이프라인
└── news_system.db             # 로컬 SQLite 데이터베이스 파일 (자동 생성)
```

---

## 2. 데이터베이스 설계 (ERD & Schema)

로컬 임베디드 데이터베이스로 SQLite를 사용하며, 애플리케이션 기동 시 테이블이 자동으로 구성되고 `src/main/resources/users.csv`로부터 100명의 가상 사용자 데이터가 자동으로 데이터베이스에 로드(Seeding)됩니다.

### 📊 엔티티 스키마 정의

#### 1. `users` (사용자 테이블)
- RSS 구독 정보 및 푸시 수신 제한 설정을 저장합니다.
- **Columns**:
  - `id` (INTEGER, PK, Auto Increment) - 제공된 `No` 컬럼 매핑
  - `name` (VARCHAR) - 사용자 이름
  - `device_id` (VARCHAR) - APNs/FCM용 고유 기기 토큰 ID
  - `push_type` (VARCHAR) - 푸시 서비스 구분 (`APNs` 또는 `FCM`)
  - `categories` (VARCHAR) - 구독 선호 카테고리 (쉼표 구분 저장, 예: `정치,경제,사회`)
  - `dnd_time` (VARCHAR) - 방해 금지 시간대 (자정 크로싱 대응 포맷, 예: `23:00-07:00` 또는 미설정 `-`)

#### 2. `articles` (뉴스 기사 테이블)
- 연합뉴스 RSS로부터 파싱된 실시간 뉴스 정보를 관리합니다.
- **Columns**:
  - `article_id` (VARCHAR, PK) - 기사 고유 ID (URL 링크의 끝자리 코드 추출하여 매핑, 예: `AKR20260518104500055`)
  - `title` (VARCHAR) - 기사 제목 (RSS CDATA 파싱)
  - `link` (VARCHAR) - 기사 원문 URL 링크
  - `dc_creator` (VARCHAR) - 작성자 / 기자 이름
  - `pub_date` (VARCHAR) - 오리지널 발행 시간 문자열
  - `parsed_pub_date` (DATETIME) - 정렬 및 만료 삭제용 변환 일시
  - `category` (VARCHAR) - 수집 출처 카테고리 (`정치`, `북한`, `경제`, `산업`, `사회`)
  - `is_read` (BOOLEAN) - 사용자 기사 읽음 여부 (기본값 `false`)

#### 3. `push_history` (푸시 알림 발송 이력 테이블)
- 발송 대상 필터링을 거쳐 실제 모의 푸시가 전송된 기록을 저장합니다.
- **Columns**:
  - `id` (INTEGER, PK, Auto Increment)
  - `device_id` (VARCHAR) - 발송된 기기 토큰 ID
  - `push_type` (VARCHAR) - `APNs` / `FCM`
  - `article_title` (VARCHAR) - 알림으로 전송된 뉴스 기사 제목
  - `article_category` (VARCHAR) - 기사 카테고리
  - `sent_at` (DATETIME) - 발송 일시
  - `status` (VARCHAR) - 발송 결과 (`success` 또는 `fail` 임의 난수 결과 기록)

---

## 3. 백엔드 핵심 기능 및 비즈니스 로직

### 🔄 실시간 RSS 수집 및 데이터 제한 (최대 1,000건)
1. Spring Boot `@Scheduled` 어노테이션을 사용하여 **10분 주기**로 연합뉴스 5개 카테고리 RSS 피드를 백그라운드 파싱합니다.
   - **정치**: `https://www.yna.co.kr/rss/politics.xml`
   - **북한**: `https://www.yna.co.kr/rss/nk.xml`
   - **경제**: `https://www.yna.co.kr/rss/economy.xml`
   - **산업**: `https://www.yna.co.kr/rss/industry.xml`
   - **사회**: `https://www.yna.co.kr/rss/society.xml`
2. 기사 파싱 시 URL 뒷부분에서 중복 없는 `article_id`를 추출해 중복 삽입을 원천 방지합니다.
3. **최대 1,000건 제한 규칙**: 기사 적재 후 전체 `articles` 테이블 레코드 개수가 1,000건을 초과하면, 발행일시(`parsed_pub_date`)가 **가장 오래된 기사부터 즉시 삭제**하여 용량을 최적화 관리합니다.

### 🎯 사용자 매칭 및 DND(방해 금지 시간) 검증
1. 신규 수집된 기사의 카테고리를 구독하는 사용자를 전체 탐색합니다.
2. 각 매칭된 사용자의 `dnd_time` 필드를 검증합니다.
   - **자정 시간대 크로싱 처리**: 방해 금지 시간이 자정을 넘는 경우(예: `23:00-07:00`)를 완벽하게 분기 처리했습니다.
     - DND 시작시간이 종료시간보다 늦을 경우: `현재시각 >= 시작시간` OR `현재시각 <= 종료시간`이면 DND 활성화 상태로 판단합니다.
     - DND 시작시간이 종료시간보다 빠를 경우: `현재시각 >= 시작시간` AND `현재시각 <= 종료시간`이면 DND 활성화 상태로 판단합니다.
     - 미설정(`-`)인 경우 무조건 DND 비활성화로 통과합니다.
3. DND 상태인 경우 푸시 발송 대상에서 제외하며(전송 건너뜀), 정상 시간대인 경우 APNs / FCM 모의 발송 인터페이스를 호출해 SQLite `push_history` 테이블에 전송 결과를 실시간 저장합니다.

---

## 4. 백엔드 REST API 명세서

모든 API는 크로스 오리진(CORS) 요청을 지원하며 프론트엔드와 유기적으로 통신합니다.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/categories` | RSS 수집용 5대 카테고리 목록 반환 |
| **GET** | `/api/articles` | 전체 뉴스 기사 조회 (최신 발행 순 정렬) |
| **GET** | `/api/articles?category={category}` | 특정 카테고리의 뉴스 기사 목록 조회 |
| **POST** | `/api/articles/{articleId}/read` | 특정 기사를 **읽음(Read)** 상태로 업데이트 |
| **GET** | `/api/users` | CSV로부터 세딩된 100명의 가상 사용자 목록 조회 |
| **GET** | `/api/push-history` | 누적 푸시 발송 이력(APNs/FCM 발송 로그) 조회 (최신 순) |
| **POST** | `/api/trigger-scheduler` | **[평가/디버그용]** RSS 수집 및 푸시 매칭 로직 즉시 실행 |

> [!TIP]
> **`/api/trigger-scheduler` (POST)** API를 호출하면, 10분을 기다릴 필요 없이 즉각적으로 RSS 수집, DND 시간대 매칭, FCM/APNs 푸시 발송 시뮬레이션이 돌아가며 요약 리포트(파싱 개수, 신규 저장 개수, 푸시 전송 건수, DND 제외 건수, 1000건 초과 삭제 건수)가 JSON 형태로 반환되어 간편한 테스트가 가능합니다.

---

## 5. 프론트엔드 UI/UX 설계 및 기능

사용자 경험을 극대화하기 위해 다크 모드 기반의 **프리미엄 글래스모피즘(Glassmorphism)** 디자인 시스템을 적용했습니다.

### 🌟 핵심 UI 구성
1. **메인 헤더**: 은은한 블루-시안 그라데이션 로고와 실시간 수동 트리거 버튼 제공.
2. **사이드바 (네비게이션 & 필터)**:
   - **기사 열람**: 실시간 뉴스 기사를 그리드 카드 형태로 렌더링.
   - **푸시 발송 이력**: 실시간 수집 및 DND 필터링이 반영된 APNs/FCM 로그를 테이블 형태로 모니터링.
   - **사용자 정보**: 세딩된 100명의 사용자 정보(DND 설정 시간, 구독 카테고리, 기기 토큰) 조회.
   - **카테고리 필터**: 5대 분야 카테고리별 실시간 필터 스위칭 효과.
3. **뉴스 카드 컴포넌트**:
   - 읽지 않은 기사는 **볼드 텍스트 및 에메랄드 컬러의 "읽지 않음" 펄싱(Pulsing) 배지**로 직관적으로 표시.
   - 읽은 기사는 불투명도가 낮아지며 차분한 슬레이트 컬러로 상태가 변경되어 시각적 피로 감소.
4. **인앱 뷰어 서랍(Drawer) & 새 창 열기**:
   - 기사를 클릭하면 오른쪽에 부드러운 애니메이션과 함께 뉴스 내용을 볼 수 있는 인앱 뷰어가 나타나며 자동으로 읽음 처리 API가 호출됩니다.
   - 브라우저 보안 규정(`X-Frame-Options`)으로 아이프레임 로드가 차단되는 뉴스 사이트들을 고려하여, 직관적인 **"새 창으로 기사 열기"** 대체 버튼 제공.

---

## 6. 빌드 및 로컬 실행 방법

### ⚙️ 요구 환경
- Java 17 이상
- Node.js & NPM (프론트엔드 빌드 타임 의존성)

### 🚀 실행 순서

#### Step 1. 저장소 클론 및 이동
```bash
git clone https://github.com/minggu-dev/news-system.git
cd news-system
```

#### Step 2. 전체 빌드 및 패키징 실행 (Gradle)
본 Gradle 프로젝트는 빌드 시 프론트엔드 리소스를 자동으로 컴파일하고 백엔드의 static 리소스로 패킹하도록 설정되어 있습니다. 별도의 Node.js 서버를 직접 구동할 필요가 없습니다.

- **Windows**:
  ```bash
  gradlew.bat clean build
  ```
- **macOS / Linux**:
  ```bash
  chmod +x gradlew
  ./gradlew clean build
  ```

#### Step 3. 애플리케이션 실행
빌드가 완료되어 생성된 단일 실행형 JAR 파일을 기동합니다.

```bash
java -jar build/libs/news-system-0.0.1-SNAPSHOT.jar
```
또는 개발 모드로 즉시 실행하려면 다음 명령어를 사용합니다:
```bash
# Windows
gradlew.bat bootRun

# macOS / Linux
./gradlew bootRun
```

#### Step 4. 웹 서비스 접속
브라우저를 열고 아래 주소로 접속합니다.
👉 **[http://localhost:8080](http://localhost:8080)**

---

## 7. CI/CD 파이프라인 (Jenkinsfile)

개발 서버나 배포 서버의 자동 빌드/검증 환경을 위해 선언적(Declarative) 명세의 `Jenkinsfile`이 내장되어 있습니다. Windows 환경의 에이전트와 Linux 환경의 에이전트 모두에서 완벽하게 동작하도록 구성되었습니다.

### 주요 파이프라인 단계:
1. **Verify Environment**: Java, Node.js, npm 버전 등 빌드 환경 필수 툴 설치 여부 사전 검증.
2. **Install Frontend Dependencies**: `frontend` 디렉토리 내에서 npm 패키지 의존성 자동 설치 (`npm install`).
3. **Build & Test Application**: Gradle 빌드 실행 (`clean build`). 프론트엔드 production 빌드 및 번들링 후 백엔드 스태틱 리소스 편입, 그리고 통합 JUnit 단위 테스트가 연속 실행됩니다.
4. **Publish Test Reports**: JUnit 테스트 결과 XML 리포트를 자동 발행 및 보관.
5. **Publish Artifacts (Success)**: 빌드 완결 후 생성된 실행 가능한 아티팩트 `build/libs/*.jar`를 자동 아카이빙합니다.
