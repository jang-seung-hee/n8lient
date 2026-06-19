// admin/operator 모바일 사이드바 drawer — overlay·ESC·body scroll lock 처리

"use client";

import { ReactNode, useEffect } from "react";

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function SidebarDrawer({ isOpen, onClose, children }: SidebarDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="ux_drawer_overlay" onClick={onClose} role="presentation">
      <aside
        className="ux_drawer_panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="내비게이션 메뉴"
      >
        <div className="ux_drawer_toolbar">
          <button
            type="button"
            className="ux_drawer_close_button"
            onClick={onClose}
            aria-label="메뉴 닫기"
          >
            ✕
          </button>
        </div>
        <div className="ux_drawer_sidebar_body">{children}</div>
      </aside>
    </div>
  );
}
