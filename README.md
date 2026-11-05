# MARK — 데일리 브리프

하드웨어 · 게임 · GitHub 트렌딩 · 유튜브 · 애니/웹툰 소식을 매일 07:00(KST)에 모아 PWA로 보여준다. 전부 무료(public repo Actions + Pages).

- 앱: https://mk-jeon.github.io/my-news/ → 크롬 메뉴 "홈 화면에 추가"
- 소스 추가/삭제: `collect/sources.mjs` 상단 상수 (`FEEDS`, `CHANNELS`, `LIKE_TAGS`)
- 로컬: `npm i && npm run check && npm run collect && npm run serve`
- 로고 재생성: `python design/make_icons.py`

## Secrets
| 이름 | 용도 |
|---|---|
| `GEMINI_API_KEY` | 영→한 번역 (없으면 Google 번역 무키 엔드포인트로 대체) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | 웹 푸시 서명. 공개키는 `docs/app.js` 에도 있음 |
| `PUSH_SUBSCRIPTIONS` | 앱 설정 → "알림 켜기"에서 나온 JSON (여러 기기면 배열) |

스크랩은 기기 localStorage 에만 저장된다 (설정 → 내보내기/가져오기).
