"use client";

import { useState, useCallback } from "react";
import { Firestore, doc, getDoc } from "firebase/firestore";
import { romanizeKorean } from "@/lib/clientNaming";

export interface UseClientIdentitySetupProps {
  db: Firestore;
  companyName: string;
  clientId: string;
  setClientId: (val: string) => void;
  setCompanyCode: (val: string) => void;
}

export interface UseClientIdentitySetupReturn {
  checkingId: boolean;
  checkingCode: boolean;
  handleRecommendId: () => Promise<void>;
  handleGenerateCode: () => Promise<void>;
}

export default function useClientIdentitySetup({
  db,
  companyName,
  clientId,
  setClientId,
  setCompanyCode,
}: UseClientIdentitySetupProps): UseClientIdentitySetupReturn {
  const [checkingId, setCheckingId] = useState(false);
  const [checkingCode, setCheckingCode] = useState(false);

  // 고객사명 기반 ID 추천 핸들러
  const handleRecommendId = useCallback(async () => {
    if (!companyName.trim()) {
      alert("먼저 고객사명을 입력해 주세요.");
      return;
    }
    setCheckingId(true);
    try {
      let baseText = "";

      // 1. 게이트웨이 번역 API 호출 시도
      try {
        const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_BASE_URL || "http://localhost:8080";
        const res = await fetch(
          `${gatewayUrl.replace(/\/$/, "")}/api/translate?q=${encodeURIComponent(companyName.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.translatedText) {
            baseText = data.translatedText.toLowerCase();
          }
        }
      } catch (translateErr) {
        console.warn("번역 API 호출 실패, 로마자 발음 표기법으로 대체합니다:", translateErr);
      }

      // 2. 번역 결과가 없거나 실패한 경우 로컬 로마자 발음 표기법 적용 (Fallback)
      if (!baseText) {
        baseText = romanizeKorean(companyName.trim().toLowerCase());
      }

      // slugify 처리 (소문자, 숫자, 언더스코어만 남기고 공백/하이픈 등은 언더스코어로 변환)
      let baseId = baseText
        .replace(/\s+/g, "_")
        .replace(/-+/g, "_")
        .replace(/[^a-z0-9_]/g, "")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");

      if (!baseId) {
        baseId = "client";
      }

      let checkId = baseId;
      let counter = 1;
      let isUnique = false;

      while (!isUnique) {
        const docRef = doc(db, "clients", checkId);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          isUnique = true;
        } else {
          counter++;
          checkId = `${baseId}_${counter}`;
        }
      }

      setClientId(checkId);
    } catch (err: any) {
      console.error(err);
      alert("ID 추천 중 오류 발생: " + err.message);
    } finally {
      setCheckingId(false);
    }
  }, [companyName, db, setClientId]);

  // 회사코드 랜덤 생성 핸들러
  const handleGenerateCode = useCallback(async () => {
    setCheckingCode(true);
    try {
      let prefix = "";
      if (clientId) {
        prefix = clientId.slice(0, 4).toUpperCase();
      } else if (companyName.trim()) {
        prefix = romanizeKorean(companyName.trim()).slice(0, 4).toUpperCase();
      } else {
        prefix = "CLI";
      }

      prefix = prefix.replace(/[^A-Z0-9]/g, "");
      if (!prefix) prefix = "CLI";

      let isUnique = false;
      let finalCode = "";

      while (!isUnique) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let randomPart = "";
        for (let i = 0; i < 4; i++) {
          randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        finalCode = `${prefix}-${randomPart}`;

        const docRef = doc(db, "companyCodeLookups", finalCode);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          isUnique = true;
        }
      }

      setCompanyCode(finalCode);
    } catch (err: any) {
      console.error(err);
      alert("회사코드 생성 중 오류 발생: " + err.message);
    } finally {
      setCheckingCode(false);
    }
  }, [clientId, companyName, db, setCompanyCode]);

  return {
    checkingId,
    checkingCode,
    handleRecommendId,
    handleGenerateCode,
  };
}
