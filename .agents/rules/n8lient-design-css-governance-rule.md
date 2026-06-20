---
trigger: always_on
---

# N8Lient Local Rule — 디자인/CSS 중앙화 원칙

## 1. 목적

N8Lient의 UI/UX 디자인 작업에서는 화면별·컴포넌트별로 스타일을 흩뿌리지 않고, 중앙 CSS와 디자인 토큰을 기준으로 일관된 디자인 체계를 유지한다.

이 규칙의 목적은 다음과 같다.

```text
1. 전체 화면의 디자인 통일성 유지
2. 추후 디자인 패치/리뉴얼 시 일괄 수정 가능성 확보
3. inline style, 임시 class, 페이지별 중복 CSS 누적 방지
4. 모바일/PC/권한별 화면의 스타일 충돌 방지
5. 유지보수 가능한 디자인 시스템 기반 구축
```

---

## 2. 기본 원칙

UI/UX 또는 디자인 관련 작업을 할 때는 반드시 아래 순서를 따른다.

```text
1. 기존 중앙 CSS / 디자인 토큰 / 공통 클래스를 먼저 검색한다.
2. 기존에 적합한 스타일이 있으면 반드시 그것을 재사용한다.
3. 적합한 스타일이 없으면 중앙 CSS에 새 토큰 또는 공통 클래스를 추가한다.
4. 추가한 중앙 CSS 클래스를 컴포넌트에서 가져다 쓴다.
5. 컴포넌트 내부 inline style 또는 페이지 전용 로컬 스타일은 원칙적으로 금지한다.
6. 로컬 스타일이 반드시 필요하면 먼저 사용자에게 이유를 설명하고 승인을 받은 뒤 적용한다.
```

---

## 3. 우선 확인할 중앙 CSS 파일

디자인 작업 전 반드시 아래 파일을 먼저 확인한다.

```text
src/styles/UX_Design_Setting.css
src/app/globals.css
```

역할 기준:

```text
UX_Design_Setting.css
- 디자인 토큰
- 공통 레이아웃 클래스
- 카드, 버튼, 패널, 사이드바, 폼 등 재사용 스타일
- PC/모바일 공통 UX 규칙
- 화면별 scope가 필요한 공통 스타일

globals.css
- 전역 import
- 기본 reset
- 앱 전체에 필요한 최소 전역 규칙
- Tailwind/global 기반 설정
```

주의:

```text
- 컴포넌트 고유 디자인 스타일은 globals.css에 무분별하게 추가하지 않는다.
- 색상, 간격, radius, shadow, layout 패턴은 가능하면 UX_Design_Setting.css에서 관리한다.
```

---

## 4. 디자인 작업 전 필수 검색

디자인 수정 전 아래 키워드로 기존 스타일을 검색한다.

```text
ux_
--ux-
card
panel
button
form
input
layout
shell
content
sidebar
aside
nav
badge
modal
empty
loading
mobile
desktop
```

작업 대상이 특정 화면이면 해당 scope 클래스도 검색한다.

예:

```text
user
operator
company-admin
execute
results
workflow
```

---

## 5. 기존 스타일 재사용 원칙

기존 중앙 CSS에 사용할 수 있는 토큰이나 클래스가 있으면 새로 만들지 않는다.

예:

```text
이미 카드 스타일이 있으면 새 card class를 만들지 않는다.
이미 버튼 스타일이 있으면 컴포넌트별 버튼 스타일을 만들지 않는다.
이미 PC wrapper가 있으면 페이지마다 max-width/padding을 새로 만들지 않는다.
이미 sidebar token이 있으면 개별 색상 하드코딩을 하지 않는다.
```

금지 예:

```tsx
<div style={{ padding: "16px", backgroundColor: "#fff", borderRadius: "12px" }}>
```

권장 예:

```tsx
<div className="ux_card">
```

또는 화면 scope가 필요한 경우:

```tsx
<div className="ux_user_card">
```

---

## 6. 새 스타일이 필요할 때

기존 중앙 CSS에 맞는 스타일이 없으면 아래 순서로 처리한다.

```text
1. 새 스타일이 정말 공통화 가능한지 판단한다.
2. 공통화 가능하면 UX_Design_Setting.css에 토큰/class를 추가한다.
3. 특정 화면 전용이면 화면 scope를 붙여 중앙 CSS에 추가한다.
4. 컴포넌트에서는 className으로 가져다 쓴다.
```

예:

```css
:root {
  --ux-user-sidebar-bg: #0f172a;
  --ux-user-sidebar-text: #e5e7eb;
}

.ux_user_sidebar {
  background: var(--ux-user-sidebar-bg);
  color: var(--ux-user-sidebar-text);
}
```

컴포넌트 적용:

```tsx
<aside className="ux_user_sidebar">
```

---

## 7. 화면별 scope 원칙

특정 화면에만 적용되는 스타일은 반드시 scope를 명확히 한다.

예:

```css
.ux_user_layout .ux_sidebar {
  ...
}

.ux_operator_layout .ux_sidebar {
  ...
}

.ux_company_admin_layout .ux_sidebar {
  ...
}
```

금지:

```css
.sidebar {
  ...
}

aside {
  ...
}

nav a {
  ...
}
```

전역 선택자로 다른 화면에 영향을 주는 수정은 금지한다.

---

## 8. PC/모바일 분리 원칙

PC 전용 수정은 반드시 media query로 제한한다.

예:

```css
@media (min-width: 1024px) {
  .ux_user_sidebar {
    position: sticky;
    top: 0;
    height: 100vh;
  }
}
```

모바일 보호 규칙도 함께 확인한다.

```css
@media (max-width: 1023px) {
  .ux_user_sidebar {
    position: static;
    height: auto;
  }
}
```

주의:

```text
- PC 수정으로 모바일 UI가 바뀌면 안 된다.
- 모바일 수정으로 PC 레이아웃이 깨지면 안 된다.
- breakpoint는 기존 프로젝트 기준을 따른다.
```

---

## 9. 로컬 스타일 금지 원칙

아래 방식은 원칙적으로 금지한다.

```text
- 컴포넌트 내부 inline style 추가
- 페이지 파일 안에 style 객체 대량 추가
- 컴포넌트별 임시 className 생성 후 개별 CSS 파일 생성
- Tailwind class를 화면마다 무질서하게 반복
- 색상/여백/폰트/테두리/그림자 하드코딩
```

금지 예:

```tsx
const style = {
  backgroundColor: "#ffffff",
  padding: "16px 12px",
  borderRadius: "12px",
};
```

금지 예:

```tsx
<div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
```

단, 기존 프로젝트가 Tailwind를 공식 디자인 방식으로 쓰는 영역이라면 기존 규칙을 따른다.
그래도 반복되는 패턴은 중앙 CSS 또는 공통 컴포넌트로 승격을 검토한다.

---

## 10. 로컬 스타일 예외 승인 규칙

로컬 스타일이 반드시 필요한 경우에는 즉시 적용하지 말고 먼저 사용자에게 보고하고 승인을 받는다.

보고 형식:

```text
로컬 스타일 예외 적용이 필요합니다.

1. 대상 파일:
2. 필요한 이유:
3. 중앙 CSS로 처리하기 어려운 이유:
4. 영향 범위:
5. 대안:
6. 승인 요청:
```

사용자 승인 전에는 로컬 스타일을 적용하지 않는다.

예외 가능 사례:

```text
- 외부 라이브러리에서 동적으로 계산되는 위치값
- runtime 계산이 필요한 width/height/transform
- 사용자 입력값에 따라 달라지는 임시 시각화 값
- canvas, chart, drag/drop, editor 등 특수 UI
- 브라우저 호환성 때문에 제한적으로 필요한 style
```

예외 적용 시에도 색상, 폰트, 여백 등 디자인 값은 가능한 중앙 CSS 토큰을 참조한다.

---

## 11. 컴포넌트 수정 원칙

공통 컴포넌트를 수정할 때는 전역 영향 가능성을 먼저 확인한다.

특히 아래 경로의 컴포넌트는 재사용 가능성이 높으므로 주의한다.

```text
src/components
src/components/core
src/components/common
src/app/*/layout.tsx
```

공통 컴포넌트에 특정 화면 전용 디자인을 직접 넣지 않는다.

권장 방식:

```tsx
<Component variant="userSidebar" />
```

또는

```tsx
<Component className="ux_user_sidebar_panel" />
```

또는 화면 wrapper scope 사용:

```css
.ux_user_layout .core_data_panel {
  ...
}
```

---

## 12. 작업 전 보고 기준

디자인 작업 전에는 가능하면 아래 형식으로 현재 구조를 먼저 보고한다.

```text
## 디자인/CSS 구조 점검

1. 수정 대상 화면:
2. 관련 파일:
3. 현재 사용 중인 중앙 CSS:
4. 기존 재사용 가능 클래스:
5. 새로 필요한 토큰/class:
6. 로컬 스타일 필요 여부:
7. 영향 가능 화면:
8. 수정 예정 범위:
```

단순한 소규모 변경이고 기존 중앙 CSS 재사용만으로 충분하면 바로 진행해도 된다.

---

## 13. 작업 후 검증

디자인/CSS 변경 후 아래를 확인한다.

```text
1. 기존 중앙 CSS 재사용 여부
2. 새 스타일이 중앙 CSS에 추가됐는지
3. 로컬 inline style이 증가하지 않았는지
4. PC/모바일 영향 범위가 분리됐는지
5. 다른 권한 화면에 영향이 없는지
6. 접근성 focus-visible/hover/active 상태가 유지되는지
```

필수 명령:

```bash
npx tsc --noEmit
npm run build
```

수동 확인:

```text
- 수정 대상 화면
- 인접 화면
- 모바일 화면
- PC 화면
- operator/company-admin/user 중 영향 가능 화면
```

---

## 14. 완료 보고 형식

디자인/CSS 작업 완료 후 아래 형식으로 보고한다.

```text
## 디자인/CSS 작업 결과

### 1. 변경 파일
- 파일명:
- 변경 내용:

### 2. 중앙 CSS 사용 여부
- 기존 재사용:
- 새로 추가한 토큰/class:
- 로컬 스타일 사용 여부:

### 3. 영향 범위
- 대상 화면:
- PC:
- 모바일:
- 다른 권한 화면:

### 4. 예외 사항
- 로컬 스타일 사용:
- 사용자 승인 여부:
- 이유:

### 5. 검증 결과
- npx tsc --noEmit:
- npm run build:
- 수동 확인:
```

---

## 15. 최종 원칙

```text
디자인은 흩뿌리지 않는다.
먼저 중앙 CSS에서 찾는다.
없으면 중앙 CSS에 추가한다.
로컬 스타일은 예외이며, 사용자 승인 후 적용한다.
```
