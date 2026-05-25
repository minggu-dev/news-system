# 연합뉴스 IT개발 경력 사전과제

연합뉴스 RSS 데이터를 활용한 통합 과제 프로젝트입니다. 하나의 Spring Boot + React 프로젝트 안에 과제 1과 과제 2를 함께 구성했습니다.

- **과제 1**: 뉴스 기사 열람 웹 애플리케이션
- **과제 2**: 뉴스 기사 푸시 전송 백엔드 시스템

공통 실행 환경과 프로젝트 구조는 이 문서에서 안내하고, 과제별 상세 구현 내용은 별도 문서로 분리했습니다.

## 문서 바로가기

| 문서 | 설명 |
| :--- | :--- |
| [과제 1. 뉴스 기사 열람 웹 애플리케이션](readme/task1/README.md) | 카테고리 선택, 기사 목록, 원문 보기, 읽음 상태, 페이징, 오류 처리 등 과제 1 상세 구현 |
| [과제 2. 뉴스 기사 푸시 전송 백엔드 시스템](readme/task2/README.md) | RSS 수집, 사용자 매칭, DND, 푸시 발송 이력 관련 문서 자리 |

## 기술 스택

| 영역 | 사용 기술 |
| :--- | :--- |
| Backend | Java 17, Spring Boot 3.5.14, Spring Data JPA |
| Database | SQLite |
| Frontend | React, Vite, Tailwind CSS, Lucide React |
| Build | Gradle, npm |
| CI/CD | Jenkinsfile |

## 프로젝트 구조

```text
news-system/
├─ frontend/
│  ├─ src/
│  │  ├─ App.jsx
│  │  ├─ components/
│  │  │  ├─ ArticleCard.jsx
│  │  │  ├─ ArticleDrawer.jsx
│  │  │  └─ PaginationBar.jsx
│  │  └─ index.css
│  ├─ package.json
│  └─ vite.config.js
├─ src/main/java/com/challenge/news_system/
│  ├─ config/
│  ├─ controller/
│  ├─ entity/
│  ├─ repository/
│  └─ service/
├─ src/main/resources/
│  ├─ users.csv
│  ├─ application.properties
│  └─ static/
├─ readme/
│  ├─ task1/
│  │  └─ README.md
│  └─ task2/
│     └─ README.md
├─ build.gradle
├─ Jenkinsfile
└─ README.md
```

## 데이터베이스 구성 및 확인 방법

본 프로젝트는 가볍고 영속적인 파일 기반 관계형 데이터베이스인 **SQLite**를 사용합니다.

### 1. DB 파일 경로

- **파일 위치**: `news_system.db` (애플리케이션 최초 구동 시 프로젝트 루트 디렉토리에 자동으로 생성됩니다.)
- **설정 정보**: `src/main/resources/application.properties` 에서 파일 경로가 설정되어 있습니다.
  ```properties
  spring.datasource.url=jdbc:sqlite:./news_system.db
  ```

### 2. 테이블 구성

1. **`articles`** (뉴스 기사 테이블)
   - RSS 피드로부터 수집된 기사 메타데이터가 적재되는 테이블입니다.
   - 주요 컬럼:
     - `article_id`: 기사 고유 ID
     - `title`: 기사 제목
     - `link`: 기사 원문 URL
     - `dc_creator`: 작성자
     - `pub_date`: 원본 발행 시각 문자열
     - `parsed_pub_date`: 정렬용 발행 시각
     - `image_url`: 썸네일 이미지 URL
     - `category`: 기사 카테고리
     - `is_read`: 읽음 여부 (Boolean)
2. **`users`** (가상 사용자 테이블)
   - 최초 구동 시 `users.csv` 파일로부터 자동 적재되는 100인의 모의 사용자 데이터입니다.
   - 주요 컬럼:
     - `id`: 사용자 ID (No 값)
     - `name`: 사용자 이름
     - `device_id`: 기기 고유 토큰 ID
     - `push_type`: 푸시 타입 (`APNs` 또는 `FCM`)
     - `categories`: 구독 관심 카테고리 목록 (콤마 구분)
     - `dnd_time`: 방해 금지 시간대
3. **`push_history`** (푸시 발송 및 재시도 이력 테이블)
   - 푸시 모의 발송 결과 및 3차 배치 재시도 과정의 상태가 기록됩니다.
   - 주요 컬럼:
     - `id`: 발송 이력 고유 일련번호
     - `device_id`: 수신 기기 고유 토큰 ID
     - `push_type`: 푸시 타입 (`APNs` 또는 `FCM`)
     - `article_title`: 전송된 기사 제목
     - `article_category`: 전송된 기사 카테고리
     - `sent_at`: 전송 및 재시도 실행 시각
     - `status`: 전송 결과 상태값 (`success` 또는 `fail`)
     - `fail_reason`: 발송 실패 사유 상세 오류 코드
     - `is_completed`: 해당 알림 발송건의 최종 완료 여부
     - `retry_count`: 누적 재시도 실행 횟수 (0 ~ 3)

### 3. DB 확인 방법 및 예시

프로젝트 루트 디렉토리에서 SQLite CLI 환경을 이용하거나, DBeaver 혹은 DB Browser for SQLite 같은 GUI 데이터베이스 관리 소프트웨어를 사용해 `news_system.db` 파일을 열어 직접 데이터를 조회할 수 있습니다.

#### CLI를 이용한 조회 예시 (루트 디렉토리 기준)

```bash
# SQLite CLI로 데이터베이스 직접 접속
sqlite3 news_system.db
```

접속 후 실행할 수 있는 조회 예시 쿼리:

* **가상 사용자 목록 조회 (상위 10명)**
  ```sql
  SELECT id, name, push_type, dnd_time, categories FROM users LIMIT 10;
  ```
* **수집된 카테고리별 뉴스 기사 적재 건수 확인**
  ```sql
  SELECT category, COUNT(*) FROM articles GROUP BY category;
  ```
* **푸시 발송 이력 실시간 모니터링 조회 (최신 5건)**
  ```sql
  SELECT id, push_type, article_title, status, retry_count, is_completed, sent_at 
  FROM push_history 
  ORDER BY sent_at DESC 
  LIMIT 5;
  ```
* **현재 백그라운드 재시도 대기 상태(1/3 ~ 3/3)인 데이터 건수 집계**
  ```sql
  SELECT retry_count + 1 AS attempt_stage, COUNT(*) 
  FROM push_history 
  WHERE status = 'fail' AND is_completed = 0 
  GROUP BY retry_count;
  ```

## 실행 방법

### 1. 프로젝트 루트 디렉토리 이동

터미널이나 명령 프롬프트를 열고, `README.md` 파일이 위치한 프로젝트 루트 디렉토리로 이동합니다.

### 2. 전체 빌드

Gradle 빌드 시 프론트엔드 production 빌드가 함께 실행되고, 결과물이 Spring Boot 정적 리소스로 복사됩니다.

Windows:

```bash
gradlew.bat clean build
```

macOS / Linux:

```bash
./gradlew clean build
```

### 3. 애플리케이션 실행

JAR 실행:

```bash
java -jar build/libs/news-system-0.0.1-SNAPSHOT.jar
```

개발 실행:

```bash
gradlew.bat bootRun
```

실행 후 브라우저에서 접속합니다.

```text
http://localhost:8080
```

## 주요 API

| Method | Endpoint | 설명 |
| :--- | :--- | :--- |
| GET | `/api/categories` | 기사 카테고리 목록 조회 |
| GET | `/api/articles?page=0&size=10` | 기사 목록 페이징 조회 |
| GET | `/api/articles?category=정치&page=0&size=10` | 카테고리별 기사 페이징 조회 |
| GET | `/api/articles?search=키워드&page=0&size=10` | 기사 제목/작성자 검색 |
| POST | `/api/articles/{articleId}/read` | 기사 읽음 처리 |
| GET | `/api/users` | 사용자 목록 조회 |
| GET | `/api/push-history?page=0&size=20` | 푸시 발송 이력 페이징 조회 |
| POST | `/api/trigger-scheduler` | 스케줄러의 RSS 기사 수집 및 푸시 매칭 로직 즉시 실행 |

### RSS 기사 수집 API

RSS 수집 로직은 스케줄러에 등록되어 서버 실행 중 10분마다 자동으로 수행됩니다. `POST /api/trigger-scheduler`는 같은 수집 로직을 수동으로 즉시 실행할 수 있도록 제공한 API입니다.

처리 흐름:

1. 정치, 북한, 경제, 산업, 사회 RSS 피드를 조회합니다.
2. RSS item에서 기사 ID, 제목, 원문 링크, 작성자, 발행 시각, 썸네일, 카테고리를 파싱합니다.
3. 이미 저장된 기사 ID는 중복 저장하지 않습니다.
4. 새로 저장된 기사가 있으면 사용자 관심 카테고리와 DND 시간을 기준으로 푸시 발송 대상을 매칭합니다.
5. 처리 결과 요약을 응답으로 반환합니다.

응답 예시:

```json
{
  "timestamp": "2026-05-25T13:30:00",
  "parsedCount": 120,
  "newSavedCount": 15,
  "pushesSent": 8,
  "pushesSkippedDnd": 2,
  "deletedOldCount": 0
}
```

## AI 활용 안내

본 프로젝트는 개발자가 주도하여 전반적인 소프트웨어 아키텍처, 데이터베이스(JPA + SQLite) 스키마 설계 및 비즈니스 핵심 코어 로직(10분 주기 RSS 파싱 및 카테고리/DND 필터링 매칭, 대용량 처리를 위한 500건 단위 배치 분할 재시도 트랜잭션 등)을 직접 설계하고 구현하였습니다.

AI(인공지능)는 개발 프로세스의 효율성을 극대화하기 위한 **단순 보조 및 검증 도구(Assistant)**로써 다음과 같이 제한적인 용도로만 활용되었습니다.

- **사용 AI 도구**: Google Gemini 1.5 Pro
- **아키텍처 및 로직 주도**: 시스템 설계 및 실질적인 비즈니스 핵심 메커니즘은 개발자가 직접 논리적 설계안을 고안하여 전담 구현.
- **제한적인 AI 활용 영역**:
  - 마크다운(README) 문서 구조화 및 API 테이블 명세의 포맷 정리
  - React 대시보드 화면 내 일부 스타일링 검토 및 컴포넌트 구조 분리 피드백
  - 코드 변경 후 빌드(Vite/Gradle) 호환성 및 JUnit 단위 테스트 자동화 검증 시 보조 도구로 활용

AI가 제시한 제안은 시스템 안정성과 사전과제 요구 명세에 맞는지 개발자가 실시간으로 코드 리뷰하고 검토한 뒤 보수적으로 반영하였습니다.
