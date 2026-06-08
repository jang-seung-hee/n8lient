// 이 파일은 웹/앱의 시각적 변수(색상, 텍스트, 로고 등)와 공통 상수를 중앙 제어하기 위한 설정 파일입니다.

export const siteConfig = {
  name: "N8Lient",
  description: "n8n 자동화 워크플로우를 직접 실행하고 결과를 확인하는 업무 자동화 클라이언트",
  url: "https://example.com",
  ogImage: "https://example.com/og.png",
  links: {
    github: "https://github.com/example/project",
    docs: "https://example.com/docs",
  },
  
  // 시각적 테마 및 스타일 토큰
  theme: {
    colors: {
      primary: {
        light: "#111111", // Black
        dark: "#111111",
      },
      secondary: {
        light: "#ffffff",
        dark: "#f3f4f6",
      },
      background: {
        light: "#ffffff",
        dark: "#f8f9fa",
      },
      text: {
        light: "#111111",
        dark: "#374151",
      }
    },
    fonts: {
      sans: "var(--font-sans)",
      heading: "var(--font-sans)",
    },
    logo: {
      text: "N8Lient",
      imageLight: "/logo-light.svg",
      imageDark: "/logo-dark.svg",
    }
  },

  // 서비스 기본 설정 문구
  messages: {
    welcome: "N8Lient에 오신 것을 환영합니다.",
    loading: "로딩 중...",
    error: "오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    companyCodePlaceholder: "회사코드 입력 (예: RTT2026)",
    companyCodeEmpty: "회사코드를 입력해 주십시오.",
    companyCodeInvalid: "존재하지 않거나 활성화되지 않은 회사코드입니다.",
    pendingApproval: "회사 관리자 승인 후 자동화 기능을 사용할 수 있습니다.",
    submitBtn: "승인 요청 제출",
    submitting: "제출 중...",
    logoutBtn: "로그아웃",
  }
};

export type SiteConfig = typeof siteConfig;
