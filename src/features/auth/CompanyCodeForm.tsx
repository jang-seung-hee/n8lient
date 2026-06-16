// 이 파일은 루트(/) 가입 화면에서 회사코드·성명을 입력받는 래퍼 컴포넌트입니다.

"use client";

import { JoinRequestForm } from "@/features/auth/JoinRequestForm";

export function CompanyCodeForm() {
  return <JoinRequestForm source="manual_code" />;
}
