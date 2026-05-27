# 0527 AI Usage Dashboard

Claude, GPT/OpenAI, Gemini 사용량 페이지를 macOS 데스크톱에 **항상 위에 고정되는 미니 대시보드**로 띄워두기 위한 Electron 앱입니다.

이 프로젝트는 iframe으로 각 서비스를 끼워 넣지 않습니다. Claude/Gemini/OpenAI 사용량 페이지는 로그인 세션 기반이고 `X-Frame-Options`, CSP, 403 같은 보호 정책으로 embed가 자주 막히기 때문입니다. 대신 Electron의 별도 로그인 세션 창을 열고, 사용자가 로그인한 뒤 페이지의 보이는 텍스트에서 사용량 관련 문구를 주기적으로 캡처합니다.

## 기능

- 항상 위에 고정되는 작은 데스크톱 창
- Claude, GPT/OpenAI, Gemini 사용량 페이지 빠른 열기
- Electron `persist:ai-usage-monitor` 세션으로 로그인 유지
- 60초마다 자동 캡처
- 서비스별 regex 패턴 기반 사용량 문구 추출
- `usage-sources.json`에서 URL, 색상, 추출 패턴 수정 가능
- iframe 차단 정책을 우회하지 않고, 일반 브라우저 창처럼 접근

## 빠른 시작

```bash
npm install
npm start
```

앱이 열리면:

1. 각 카드의 **창 열기**를 누릅니다.
2. Claude, OpenAI, Gemini에 로그인합니다.
3. 미니 대시보드에서 **캡처** 또는 **전체 새로고침**을 누릅니다.
4. 이후 앱이 `refreshIntervalMs` 주기로 자동 갱신합니다.

## 설정

`usage-sources.json`에서 소스를 수정할 수 있습니다.

```json
{
  "refreshIntervalMs": 60000,
  "sources": [
    {
      "id": "claude",
      "label": "Claude",
      "url": "https://claude.ai/settings/usage",
      "patterns": ["remaining[^\\n]{0,80}", "usage[^\\n]{0,120}"]
    }
  ]
}
```

- `refreshIntervalMs`: 자동 갱신 주기입니다. 너무 짧게 잡지 않는 것을 권장합니다.
- `url`: 사용량 페이지 주소입니다.
- `patterns`: 페이지 텍스트에서 뽑아낼 문구 regex 목록입니다.

## GPT/OpenAI URL 주의

현재 기본 GPT/OpenAI URL은 다음입니다.

```text
https://platform.openai.com/usage
```

이 주소는 OpenAI API 사용량/비용 페이지입니다. ChatGPT Plus/Pro의 메시지 제한 페이지와는 다를 수 있습니다. ChatGPT 앱 내부의 정확한 사용량 URL이 있다면 `usage-sources.json`에서 바꿔주세요.

## 왜 iframe이 아닌가?

확인된 제약:

- Gemini usage 페이지는 `X-Frame-Options: DENY`를 내려 iframe 삽입을 막습니다.
- Claude/OpenAI 계정 페이지는 로그인 세션 없는 외부 요청에서 403 또는 리디렉션이 발생할 수 있습니다.
- 서비스 페이지 DOM은 자주 바뀔 수 있어, 강한 API 연동처럼 신뢰하면 안 됩니다.

그래서 이 앱은 다음 원칙을 따릅니다.

- 사용자가 직접 로그인한 Electron 브라우저 창을 사용합니다.
- 자동화는 읽기 중심으로 제한합니다.
- 사용량 추출에 실패하면 원본 페이지 창을 바로 열어 확인할 수 있게 합니다.

## 개발 명령어

```bash
npm run check      # JS 문법 검사 + 설정 검증
npm run smoke      # 필수 파일/보안 설정/세션 설정 확인
npm test           # check + smoke
npm start          # 앱 실행
```

## 보안/운영 메모

- 로그인 쿠키는 Electron의 `persist:ai-usage-monitor` 세션에 저장됩니다.
- 이 앱은 비밀번호나 쿠키를 README/로그에 출력하지 않습니다.
- 페이지 구조가 바뀌면 추출 패턴이 실패할 수 있습니다.
- 자동 새로고침 주기를 너무 짧게 설정하면 서비스에서 비정상 접근으로 볼 수 있으므로 60초 이상을 권장합니다.

## 향후 개선 아이디어

- macOS 메뉴바 앱 모드
- 남은 사용량 임계치 알림
- 히스토리 저장 및 일별 그래프
- OCR fallback
- 서비스별 전용 selector 프리셋
- ChatGPT Plus/Pro 전용 사용량 URL이 확인되면 별도 카드 추가
