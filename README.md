# JIYEON LEE — Portfolio

HTML · CSS · Vanilla JavaScript로 만든 개인 포트폴리오. 프레임워크와 빌드 도구 없이 동작하며, **이벤트 → 상태 변경 → 화면 업데이트** 흐름을 코드로 따라갈 수 있게 구성했습니다.

[포트폴리오 보기](https://bborang.github.io/codyssey-B1-1/) · [저장소](https://github.com/bborang/codyssey-B1-1)

## 미리보기

| 라이트 모드 | 다크 모드 |
| --- | --- |
| ![라이트 모드 첫 화면](images/screenshots/desktop.png) | ![다크 모드 첫 화면](images/screenshots/dark.png) |

![모바일 화면](images/screenshots/mobile.png)

## 주요 기능

| 영역 | 구현 |
| --- | --- |
| 반응형 | 모바일 기본 + `min-width: 768px`, `1024px` 확장 |
| 테마 | 다크·라이트 전환, localStorage 저장·복원 |
| 탐색 | 햄버거 메뉴(링크·Escape·바깥 클릭으로 닫힘), 스크롤 헤더, 맨 위로 |
| 애니메이션 | Intersection Observer 등장 효과, 모션 감소 대응 |
| 프로젝트 | GitHub API 조회, 로딩·성공·빈 결과·오류 4상태, 15초 타임아웃, 재시도 |
| 문의 | 입력 중 검증 + 제출 시 전체 검증, 첫 오류 필드 포커스 |
| 접근성 | 본문 바로가기, 시맨틱 태그, `label` 연결, `aria-*`, 포커스 표시 |

- 외부 연결은 **GitHub REST API 하나뿐** — CDN·폰트 서버·패키지 설치 없음
- 문의 폼은 **입력 검증용**이며 실제 메일을 보내지 않음

## 1. 구조와 설계

```text
├── index.html       # 콘텐츠, 시맨틱 구조, 폼
├── css/style.css    # 변수, 테마, 컴포넌트, 반응형
├── js/main.js       # 상태, 이벤트, 렌더, API, 폼 검증
└── images/
```

### 파일을 셋으로 나눈 이유

| 파일 | 답하는 질문 | 고칠 일이 생기는 순간 |
| --- | --- | --- |
| `index.html` | 무엇이 있는가 | 소개 문구·수상 이력·링크 수정 |
| `style.css` | 어떻게 보이는가 | 색·여백·카드 배치 수정 |
| `main.js` | 무엇이 일어나는가 | 검증 조건·API 주소·인터랙션 수정 |

- **관심사 분리** = 변경 목적이 다른 코드를 나누는 것 → 수정 지점이 하나로 좁혀짐
- 브라우저가 CSS·JS를 **개별 캐싱** → HTML 문구만 바꿔도 나머지는 다시 안 받음
- `<script defer>`로 연결 → HTML 파싱을 막지 않고, 문서 완성 후 실행
- 그래서 `main.js`는 `DOMContentLoaded` 없이 첫 줄부터 `querySelector` 사용 가능

### JavaScript의 역할 구분

| 구분 | 역할 | 예시 |
| --- | --- | --- |
| DOM 참조 | 조작할 요소를 한 번만 찾아 보관 | `header`, `menuButton` |
| 상태 | 현재 화면을 결정하는 데이터 | `state`, `projectState`, `formState` |
| 이벤트 | 입력에 반응해 **상태만** 변경 | `addEventListener` 콜백 |
| 렌더 | 상태를 읽어 DOM에 반영 | `renderTheme`, `renderProjects` |
| 외부 작업 | 데이터 요청 | `loadProjects` |

### 상태 객체를 셋으로 나눈 이유

```js
const state        = { menuOpen: false, theme: "light", scrolled: false, showTopButton: false };
const projectState = { status: "idle", repos: [], error: "" };
const formState    = { errors: {}, success: false };
```

- 각 객체가 **자기 렌더 함수와 1:1** — `projectState`가 바뀌면 `renderProjects()`만 호출
- 하나로 합치면 값 하나만 바뀌어도 어떤 렌더를 불러야 할지 매번 따져야 함

**흩어진 변수 대신 객체로 묶으면**

- 현재 상태를 한 줄로 확인 — `console.log(projectState)`
- 읽는 쪽(렌더)과 쓰는 쪽(이벤트)의 경계가 생김
- **불가능한 조합을 막음** — `status` 문자열 하나면 로딩과 오류가 동시에 참일 수 없음. `isLoading`·`hasError` 같은 boolean 여러 개였다면 둘 다 true인 상태가 생길 수 있음
- 구조 분해로 한 번에 꺼냄 — `const { status, repos, error } = projectState;`

> ⚠️ 평범한 객체라 **값을 바꿔도 화면이 저절로 갱신되지 않음.** 상태 변경 후 렌더 함수를 직접 호출해야 함. 프레임워크가 자동으로 해 주는 일이 바로 이 지점.

<a id="flows"></a>

## 2. 코드 흐름

### 2-1. 테마 — 이벤트 → 상태 → 화면

```js
themeButton.addEventListener("click", () => {
  state.theme = state.theme === "light" ? "dark" : "light";  // ① 상태만 바꾼다
  renderTheme();                                             // ② 화면 반영은 렌더가 맡는다
  try { localStorage.setItem(THEME_KEY, state.theme); } catch {}
});

const renderTheme = () => {
  const isDark = state.theme === "dark";
  root.dataset.theme = state.theme;                          // 색 전체가 여기서 바뀐다
  themeButton.setAttribute("aria-pressed", String(isDark));
  themeButton.textContent = isDark ? "☀" : "◐";
};
```

**핵심 원칙** — 이벤트 핸들러는 **상태만** 바꾸고, DOM 조작은 전부 `render*`에 모음

- 초기 렌더와 이벤트 렌더가 **같은 함수**를 씀 → 초기화 코드 중복이 없음
- 버튼 아이콘 · `aria-pressed` · 실제 색이 **어긋날 수 없음** (셋 다 `state.theme` 하나에서 나옴)
- 버그 추적이 "상태가 틀렸나 / 렌더가 틀렸나" 두 갈래로 좁혀짐
- `main.js`에 색을 직접 지정하는 코드는 **한 줄도 없음** — `data-theme`만 바꾸고 나머지는 CSS가 처리

### 2-2. 테마 저장 — `localStorage`를 `try/catch`로 감싼 이유

**역할 분담**

- `state.theme` = 지금 이 화면의 값 / `localStorage` = 다음 방문에 복원할 값
- `renderTheme()`은 `state.theme`만 읽고 `localStorage`는 쳐다보지 않음
- → 저장이 실패해도 화면은 멀쩡. "이번 방문만 유지되는 테마"로 한 단계 낮아질 뿐

**읽기와 쓰기를 따로 감싼 이유** — 실패 시점과 대처가 다름

| 상황 | 던지는 시점 | 예외 |
| --- | --- | --- |
| 쿠키·사이트 데이터 차단 | **접근하는 순간** (읽기·쓰기 모두) | `SecurityError` |
| `allow-same-origin` 없는 iframe | 접근하는 순간 | `SecurityError` |
| 구버전 Safari 개인정보 보호 창 | 저장할 때 | `QuotaExceededError` |
| 저장 용량 초과 (약 5MB) | 저장할 때 | `QuotaExceededError` |

- 읽기 실패 → 기본값 라이트로 시작
- 쓰기 실패 → `state.theme`은 이미 바뀐 뒤라 **할 일 없음** (그래서 `catch`가 비어 있음)
- `localStorage`가 `undefined`가 되는 게 아니라 **속성 접근 자체가 던짐** → `if (window.localStorage)`도 그 자리에서 터짐. 미리 확인할 방법이 없어 `try/catch`가 유일한 방어

**감싸지 않으면 페이지 전체가 죽음** ← 진짜 이유

`main.js`는 일반 스크립트 → **최상위 예외가 나면 그 아래 코드가 전부 실행되지 않음.** 저장값 읽기는 파일 맨 위, 이벤트 등록은 전부 그 아래.

| 실행되지 못하는 코드 | 증상 |
| --- | --- |
| `menuButton.hidden = false` | 햄버거·테마 버튼이 **안 보임** |
| 모든 `addEventListener` | 스크롤·맨 위로·등장 효과 전부 죽음 |
| `loadProjects()` | 프로젝트가 영원히 로딩 전 상태 |
| `submitButton.disabled = false` | 제출 버튼이 **비활성으로 굳음** |

→ `try/catch`의 역할은 **"테마 저장 실패"가 "사이트 전체 고장"으로 번지는 걸 막는 것**

**저장값 검증** — `"dark"`·`"light"`일 때만 수용

- localStorage는 사용자가 직접 고칠 수 있음 → 그대로 믿으면 CSS에 없는 테마가 적용돼 색이 깨짐
- 외부에서 들어온 값은 믿지 않는다 — `escapeHTML()`과 같은 원칙

### 2-3. GitHub API — 비동기 요청과 화면 분기

```text
loadProjects()
  → 중복 호출 차단 (이미 loading이면 return)
  → status = "loading" + 렌더
  → AbortController 15초 타이머
  → await fetch() → response.ok 검사 → 실패는 직접 throw
  → await response.json() → 배열·형식 검사
  → 길이에 따라 "empty" 또는 "success"
catch  → status = "error" + 상황별 메시지
finally → 타이머 해제 + 렌더 (성공·실패 공통)
```

| 상태 | 화면 |
| --- | --- |
| `loading` | "프로젝트를 불러오는 중입니다…" |
| `error` | 원인별 안내 + [다시 시도] 버튼 |
| `empty` | "표시할 프로젝트가 없습니다." |
| `success` | 개수 안내 + 프로젝트 카드 |

**기억할 점 4가지**

1. **`fetch`는 HTTP 오류에 reject하지 않음** — 404·403도 "응답을 받았다"고 정상 완료. 네트워크 자체가 끊겨야 reject → `response.ok`를 직접 검사하고 `throw`해야 `catch`로 감
2. **403·429를 따로 분기** — 인증 없는 GitHub API는 시간당 60회 제한. 원인을 알려 주기 위해
3. **`AbortController`로 15초 타임아웃** — 응답이 안 오는 경우 대비. 중단되면 `error.name === "AbortError"`로 구분해 전용 안내
4. **`finally`에 마무리를 모음** — `clearTimeout()`·`renderProjects()`를 성공·실패 양쪽에 따로 쓰면 한쪽을 빠뜨리기 쉬움

> `await`는 브라우저를 멈추지 않고 **해당 함수의 진행만** 기다림. 응답 대기 중에도 테마 전환·스크롤은 정상 동작.

### 2-4. 응답 데이터 → 카드 UI

```text
저장소 배열 → every(형식 검사) → map(카드 HTML 생성) → join("") → innerHTML
```

1. **검사** — `repos.every(r => r && typeof r.name === "string")` · 하나라도 실패하면 즉시 중단
2. **변환** — `map` 매개변수 자리에서 바로 구조 분해 → `{ name, description, language, stargazers_count }` · 필드 수십 개 중 쓰는 4개만 적어 의도를 드러냄
3. **연결** — `map`이 돌려주는 건 문자열 **배열** → `join("")` 없이 넣으면 쉼표가 낌. DOM 삽입도 N번이 아니라 1번
4. **이스케이프** — `escapeHTML()`로 `& < > " '` 치환, 링크는 고정 도메인 + `encodeURIComponent(name)`

**빈 값 처리 — `||`와 `??`를 구분해 쓴 이유**

| 표현 | 이유 |
| --- | --- |
| `language \|\| "언어 정보 없음"` | `null`과 빈 문자열을 함께 걸러야 함 |
| `stargazers_count ?? 0` | **스타 0개는 유효한 값** → `\|\|`를 쓰면 0이 사라짐 |

### 2-5. 문의 폼 — 입력 중 검증 → 제출 검증

```text
input  → 그 필드만 검사 → 오류 문구·aria-invalid 갱신
submit → preventDefault() → 전체 검사
         ├─ 오류 있음: 전체 표시 + 첫 오류 필드로 포커스 이동
         └─ 오류 없음: 확인 메시지
```

- **두 단계로 나눈 이유** — 페이지를 열자마자 빈 필드 셋에 빨간 오류가 뜨면 안 한 실수를 지적받는 느낌. `input` 단계에서는 **건드린 필드만** 검사
- **이메일은 두 가지를 함께 확인** — `field.validity.typeMismatch`(브라우저 내장) + 정규식. 둘 다 **형식**만 보며 실제 존재 여부는 알 수 없음
- **첫 오류 필드로 포커스 이동** — 긴 폼에서 오류를 찾아 헤매지 않게

### 2-6. 메뉴와 스크롤

| 동작 | 처리 | 기준 |
| --- | --- | --- |
| 메뉴 열기·닫기 | `state.menuOpen` → `renderMenu()` | 클래스·`aria-expanded`·버튼 글자 동시 갱신 |
| 링크 클릭 / Escape / 바깥 클릭 | `closeMenu()` | 갇히는 상황 방지 (닫는 경로 3가지) |
| 화면 크기 변경 | `closeMenu()` + 포커스 재배치 | `matchMedia("(min-width: 768px)")` |
| 헤더 스타일 | `state.scrolled` | `scrollY >= 60` |
| 맨 위로 버튼 | `state.showTopButton` | `scrollY >= 300` |
| 등장 효과 | `IntersectionObserver` | `threshold: 0.2`, 표시 후 `unobserve` |

- 스크롤 리스너에 `{ passive: true }` → 브라우저가 기다리지 않고 바로 스크롤
- 등장 효과는 섹션 전체가 아니라 **제목·카드 단위**로 관찰 — 세로로 긴 모바일 섹션은 화면의 20%를 채우기 어려워 끝내 안 나타날 수 있음

<a id="concepts"></a>

## 3. 개념 요약 — 왜 이렇게 작성했나

| 개념 | 뜻 | 이 프로젝트에서의 선택 |
| --- | --- | --- |
| 시맨틱 HTML | 콘텐츠의 의미를 나타내는 태그 | `nav`·`main`·`section`·`article` |
| CSS 변수 | 반복 값을 이름으로 관리 | `:root` 정의 + 다크 테마 재정의 |
| 이벤트 리스너 | 동작에 반응할 함수 등록 | 인라인 `onclick` 대신 `addEventListener` |
| Flexbox | 한 축 중심 정렬·공간 배분 | 내비게이션, 버튼, 태그 |
| Grid | 행·열 구조 배치 | Hero, About, 카드 목록 |
| 모바일 퍼스트 | 작은 화면 기본 + 큰 화면 확장 | `min-width`만 사용 |
| async/await | 비동기를 동기 코드처럼 표현 | GitHub 응답 대기 |
| try/catch/finally | 실행·예외·공통 마무리 | API 오류, 타이머 해제 |

### 시맨틱 태그를 고른 기준

> "이 영역을 목차에 적는다면 뭐라고 쓸까"를 먼저 정하고 태그 선택

| 태그 | 위치 | 기준 |
| --- | --- | --- |
| `header`/`footer` | 상·하단 | 페이지 전체의 머리말·꼬리말 |
| `nav` | 주요 메뉴 | 주요 이동 링크의 묶음 |
| `main` | 본문 | 문서당 하나, 고유 콘텐츠만 |
| `section` | Hero·About·Skills·Projects·Contact | **제목을 붙일 수 있는** 주제 단위 |
| `article` | 수상·스킬·프로젝트 카드 | 떼어 내도 말이 되는 독립 단위 |
| `figure`/`figcaption` | 프로필 이미지 | 이미지 + 설명 캡션 쌍 |
| `dl`/`dt`/`dd` | 활동 타임라인 | 기간(용어) ↔ 내용(설명) 짝 |
| `div` | `.about-layout`, `.nav-actions` | **의미 없이 배치만** 하는 래퍼 |

- 마지막 줄이 중요 — 의미 없는데 `section`을 쓰면 스크린 리더의 문서 개요가 오염됨
- 모든 `section`에 `aria-labelledby`로 자기 제목 연결

### CSS 변수로 얻은 것

1. **테마 전환이 재정의 한 블록으로 끝남** — 같은 이름의 값만 바꾸면 그 변수를 쓰는 모든 규칙이 동시에 변경. 다크 모드용 클래스가 따로 필요 없음
2. **값이 한 곳에만 있음** — `--color-primary` 한 줄만 수정. `#4054bc` 찾아 바꾸기는 누락·오치환 위험
3. **런타임에 살아 있음** — Sass 변수는 컴파일 시점에 사라지지만 CSS 변수는 브라우저가 상속·계산 → JS가 `data-theme` 하나만 바꿔도 즉시 반영

### `addEventListener`를 쓴 이유

**둘은 구조가 다름**

- `onclick` = 요소의 **속성 한 칸** → 값을 넣으면 이전 게 사라짐 (경고도 오류도 없음)
- `addEventListener` = **등록 목록에 추가** → 기존 항목은 그대로

```js
button.onclick = a;  button.onclick = b;                   // a는 조용히 사라진다
button.addEventListener("click", a);  ...("click", b);     // 둘 다 실행된다
```

**인라인 핸들러는 스코프가 이상함**

```html
<button id="save" onclick="console.log(id)">저장</button>
<!-- 전역 변수 id가 아니라 버튼의 id 속성인 "save"가 찍힌다 -->
```

- 브라우저가 **요소 → 폼 → document → 전역** 스코프 체인을 끼워 넣음
- `id`·`name`·`title` 같은 흔한 이름이 내 변수보다 **요소 속성으로 먼저** 잡힘
- 전역에서 닿는 이름만 부를 수 있어 `type="module"`로 바꾸면 전부 깨짐

**인라인으로는 아예 불가능했던 네 곳** ← 이게 실제 이유

| 자리 | 인라인이 안 되는 이유 |
| --- | --- |
| `document` 바깥 클릭 감지 | `document`에는 속성을 붙일 HTML 태그가 없음 |
| `matchMedia` 변화 감지 | DOM 요소가 아니라 그냥 객체 — 태그 자체가 없음 |
| `{ passive: true }` | 인라인에는 옵션을 줄 문법이 없음 |
| 동적 생성 카드 | 핸들러가 전역이어야 하고, 코드가 HTML 속성값 안에 들어가 이스케이프가 겹침 |

- **바깥 클릭이 메뉴 버튼까지 삼키지 않는 이유** — 버튼을 누르면 버튼 핸들러가 먼저 실행돼 메뉴가 열리고, 그 클릭이 `document`까지 **버블링**됨. 이때 `event.target`이 헤더 안쪽이라 `header.contains(...)`가 참이 되어 닫지 않음. 바깥을 눌렀을 때만 거짓
- **`passive`가 중요한 이유** — 브라우저는 핸들러가 `preventDefault()`를 부를지 미리 알 수 없어 핸들러가 끝날 때까지 기다렸다 화면을 움직임. `passive: true`는 "취소 안 하겠다"는 약속
- **`return false` 주의** — 인라인에서는 취소 + 전파 중단을 함께 하지만, `addEventListener`에서는 **아무 일도 하지 않음** → 폼에서 `event.preventDefault()`를 명시
- CSP에 `'unsafe-inline'`이 없으면 인라인 핸들러는 **전부 차단**됨

> `index.html`에 `onclick` 속성은 **한 개도 없음**

### Flexbox와 Grid를 나눈 기준

> **내용물이 크기를 정하면 Flex, 컨테이너가 자리를 정하면 Grid**

| 방식 | 위치 | 이유 |
| --- | --- | --- |
| Flex | `.navigation` | 한 방향 정렬 + `space-between`. 폭이 서로 달라 격자가 불필요 |
| Flex | `.button-group`, `.tag-list` | 개수가 유동적, 각 항목이 자기 글자 수만큼만 차지 |
| Flex | `.project-card` 내부 | `margin-top: auto`로 **메타 정보를 카드 바닥에 고정** |
| Grid | `.projects-grid` | `repeat(auto-fit, minmax(min(100%, 280px), 1fr))` — 미디어 쿼리 없이 열 수 자동 결정 |
| Grid | `.hero` | `1.2fr 1fr` 비율 + `grid-column: 1 / -1`로 푸터가 전체 너비 (Flex엔 없는 기능) |
| Grid | `.about-layout` | `240px 1fr` — 프로필 고정 폭, 본문은 나머지 |
| Grid | `.skills-grid`, `.awards` | 카드의 **행·열이 맞아떨어져야** 함. Flex의 `wrap`은 마지막 줄 정렬이 어긋남 |

### 반응형

| 너비 | 배치 |
| --- | --- |
| ~767px (기본) | 전 영역 1열, 햄버거 메뉴 |
| 768px~ | Hero 2열, About 240px+본문, 스킬·수상·문의 2열, 가로 내비게이션 |
| 1024px~ | 스킬 4열, About 280px+본문, 섹션 여백 확대 |

**모바일 퍼스트로 쓴 이유** — 미디어 쿼리가 `min-width` 두 개뿐이고 `max-width`는 0개. 즉 **기본 스타일이 곧 모바일 스타일**

- CSS가 짧아짐 — 데스크톱 퍼스트면 "2열을 1열로 되돌리는" 재정의가 계속 붙음 (현재 미디어 쿼리는 합쳐서 20여 줄)
- 모바일 기기가 불필요한 규칙을 파싱하지 않음
- 제약에서 시작하면 "무엇을 먼저 보여야 하는가"가 정해짐
- 포트폴리오는 링크로 공유되어 **모바일에서 먼저 열림**
- 중단점은 기기 크기가 아니라 **레이아웃이 깨지는 지점**을 보고 결정 — 스킬 카드가 2개 들어갈 만해지는 지점이 768px, 4개가 편해지는 지점이 1024px

<a id="accessibility"></a>

## 4. 접근성과 점진적 향상

| 항목 | 구현 |
| --- | --- |
| 본문 바로가기 | `.skip-link` — 포커스 시 노출 |
| 폼 라벨 | 모든 입력에 `label`을 `for`/`id`로 연결 |
| 메뉴·테마 상태 | `aria-expanded`, `aria-controls`, `aria-pressed` |
| 오류 필드 | `aria-invalid`, `aria-describedby` |
| 상태 안내 | `role="status"`, `aria-live="polite"`, `aria-busy` |
| 포커스 표시 | `:focus-visible` 3px 외곽선 |
| 터치 영역 | 버튼·메뉴 링크 최소 2.75rem |
| 모션 감소 | `prefers-reduced-motion`에서 애니메이션 생략 |

**JS가 꺼져 있어도 읽을 수 있게**

- **메뉴** — 접는 CSS는 `.interactions-ready` 클래스 아래에만 존재. 이 클래스는 JS가 초기화를 마친 뒤 붙음 → 스크립트가 안 돌면 메뉴가 펼쳐진 채 남아 탐색 가능
- **폼** — `novalidate`를 HTML 속성이 아니라 JS 마지막 줄에서 켬 → JS가 있으면 커스텀 오류 UI, 없으면 브라우저 기본 검증
- 제출 버튼도 HTML에서 `disabled`로 시작 → 아무 일도 안 하는 버튼을 누르게 되지 않음

<a id="review"></a>

