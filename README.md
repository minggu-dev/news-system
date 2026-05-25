# 연합뉴스 IT개발 경력 사전과제

연합뉴스 RSS 데이터를 활용한 통합 과제 프로젝트입니다. 하나의 Spring Boot + React 프로젝트 안에 과제 1과 과제 2를 함께 구성했습니다.

- **과제 1**: 뉴스 기사 열람 웹 애플리케이션
- **과제 2**: 뉴스 기사 푸시 전송 백엔드 시스템

공통 실행 환경과 프로젝트 구조는 이 문서에서 안내하고, 과제별 상세 구현 내용은 별도 문서로 분리했습니다.

## 문서 바로가기

| 문서 | 설명 |
| :--- | :--- |
| [과제 1. 뉴스 기사 열람 웹 애플리케이션](readme/task1/) | 카테고리 선택, 기사 목록, 원문 보기, 읽음 상태, 페이징, 오류 처리 등 과제 1 상세 구현 |
| [과제 2. 뉴스 기사 푸시 전송 백엔드 시스템](readme/task2/) | RSS 수집, 사용자 매칭, DND, 푸시 발송 이력 관련 문서 자리 |

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

## 실행 방법

### 1. 저장소 이동

```bash
cd news-system
```

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
| POST | `/api/trigger-scheduler` | RSS 수집 및 푸시 매칭 로직 즉시 실행 |

## AI 활용

개발 과정에서 AI를 보조 도구로 활용했습니다.

- README 및 문서 구조 정리
- UI/UX 개선 방향 검토
- React 컴포넌트 분리 및 페이징 UI 정리
- API 오류 처리와 서버 페이징 구현 방향 검토
- 코드 변경 후 lint/build/test 검증 보조

AI가 제안한 내용은 프로젝트 요구사항과 실제 코드 동작에 맞게 검토 후 반영했습니다.
