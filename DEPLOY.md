# 배포 가이드

## 1. 백엔드 (Railway)

### 설정 순서
1. [Railway](https://railway.app) 가입 + GitHub 연결
2. "New Project" → "Deploy from GitHub Repo"
3. Root Directory: `backend` 설정
4. PostgreSQL 추가: "New" → "Database" → "PostgreSQL"
5. 환경변수 설정:

| 변수 | 값 |
|------|-----|
| DATABASE_URL | (PostgreSQL 추가 시 자동 설정됨) |
| OPENAI_API_KEY | OpenAI API 키 |
| NAVER_CLIENT_ID | 네이버 개발자 Client ID |
| NAVER_CLIENT_SECRET | 네이버 개발자 Client Secret |
| KAKAO_REST_API_KEY | 카카오 REST API 키 |
| KAKAO_ACCESS_TOKEN | 카카오 액세스 토큰 |
| FRONTEND_URL | Vercel 배포 URL (예: https://your-app.vercel.app) |

6. Deploy 클릭 → 배포 URL 확인 (예: https://your-backend.railway.app)

## 2. 프론트엔드 (Vercel)

### 설정 순서
1. [Vercel](https://vercel.com) 가입 + GitHub 연결
2. "Import Project" → GitHub 레포 선택
3. Root Directory: `frontend` 설정
4. Framework Preset: Next.js (자동 감지)
5. 환경변수 설정:

| 변수 | 값 |
|------|-----|
| NEXT_PUBLIC_API_URL | Railway 백엔드 URL (예: https://your-backend.railway.app) |

6. Deploy 클릭

## 3. 배포 후 확인

1. Vercel URL 접속 → 대시보드 확인
2. 글 작성 → AI 보정 → 에디터 → 발행 테스트
3. 협찬 일정 등록 테스트

## API 키 발급 가이드

### OpenAI API
1. https://platform.openai.com 접속
2. API Keys → "Create new secret key"

### 네이버 개발자
1. https://developers.naver.com 접속
2. 애플리케이션 등록
3. 검색 API (블로그, 지역) 사용 설정
4. Client ID / Secret 확인

### 카카오 개발자
1. https://developers.kakao.com 접속
2. 애플리케이션 추가
3. REST API 키 확인
4. 카카오 로그인 → 동의항목 → "카카오톡 메시지 전송" 활성화
5. 토큰 발급 (카카오톡 나에게 보내기용)
