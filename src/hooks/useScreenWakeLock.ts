"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type WakeLockSentinelLike = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: () => void) => void;
  removeEventListener: (type: "release", listener: () => void) => void;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
};

type UseScreenWakeLockOptions = {
  active: boolean;
  reason?: string;
};

/**
 * 모바일 브라우저 환경에서 장시간 작업(음성 녹음, 파일 업로드 등) 수행 시
 * 기기의 화면이 자동으로 꺼지는 것을 방지하는 Screen Wake Lock Hook
 */
export function useScreenWakeLock({ active, reason }: UseScreenWakeLockOptions) {
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const releaseHandlerRef = useRef<(() => void) | null>(null);

  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wake Lock 해제
  const releaseWakeLock = useCallback(async () => {
    const sentinel = wakeLockRef.current;

    if (!sentinel) {
      setIsActive(false);
      return;
    }

    try {
      if (releaseHandlerRef.current) {
        sentinel.removeEventListener("release", releaseHandlerRef.current);
      }

      if (!sentinel.released) {
        await sentinel.release();
      }
    } catch (err) {
      console.warn("[useScreenWakeLock] release failed", err);
    } finally {
      wakeLockRef.current = null;
      releaseHandlerRef.current = null;
      setIsActive(false);
    }
  }, []);

  // Wake Lock 요청
  const requestWakeLock = useCallback(async () => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const nav = navigator as NavigatorWithWakeLock;

    if (!nav.wakeLock?.request) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    if (!active) {
      return;
    }

    if (document.visibilityState !== "visible") {
      return;
    }

    if (wakeLockRef.current && !wakeLockRef.current.released) {
      setIsActive(true);
      return;
    }

    try {
      const sentinel = await nav.wakeLock.request("screen");

      const handleRelease = () => {
        wakeLockRef.current = null;
        releaseHandlerRef.current = null;
        setIsActive(false);
      };

      sentinel.addEventListener("release", handleRelease);

      wakeLockRef.current = sentinel;
      releaseHandlerRef.current = handleRelease;
      setIsActive(true);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "wake lock request failed";
      setError(message);
      setIsActive(false);
      console.warn("[useScreenWakeLock] request failed", {
        reason,
        error: err,
      });
    }
  }, [active, reason]);

  // 클라이언트 브라우저 지원 여부 초기 확인
  useEffect(() => {
    if (typeof navigator !== "undefined") {
      const nav = navigator as NavigatorWithWakeLock;
      setIsSupported(Boolean(nav.wakeLock?.request));
    }
  }, []);

  // active 값에 따른 요청/해제 제어
  useEffect(() => {
    if (active) {
      void requestWakeLock();
    } else {
      void releaseWakeLock();
    }

    return () => {
      void releaseWakeLock();
    };
  }, [active, requestWakeLock, releaseWakeLock]);

  // 탭 전환(비활성화/활성화) 시 재획득 흐름 제어
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && active) {
        void requestWakeLock();
      }

      if (document.visibilityState !== "visible") {
        wakeLockRef.current = null;
        releaseHandlerRef.current = null;
        setIsActive(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [active, requestWakeLock]);

  return {
    isSupported,
    isActive,
    error,
  };
}
