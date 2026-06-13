/**
 * N8Lient 공통 UI 효과음 시스템 (v1.0)
 * 브라우저 자동재생 제한 우회 및 캐싱, 녹음 중 Mute 기능 내포
 */

export type AppSoundType = "click" | "success" | "error" | "notify";

const SOUND_PATHS: Record<AppSoundType, string> = {
  click: "/sounds/universfield-computer-mouse-click-352734.mp3",
  success: "/sounds/freesound_community-success-1-6297.mp3",
  error: "/sounds/freesound_community-windows-error-sound-effect-35894.mp3",
  notify: "/sounds/notification_message-notification-alert-4-331722.mp3",
};

// 전역 설정 상태 (SSR 대응)
let isMuted = false;
let globalVolume = 0.35;
const audioCache: Partial<Record<AppSoundType, HTMLAudioElement>> = {};

/**
 * 전역 음소거 토글 (음성 녹음 중 UI 소리 유입 방지용)
 */
export function setAppSoundMuted(muted: boolean): void {
  isMuted = muted;
}

/**
 * 전역 볼륨 조절
 */
export function setAppSoundVolume(volume: number): void {
  globalVolume = Math.max(0, Math.min(1, volume));
  // 캐싱된 오디오들의 볼륨 일괄 수정
  Object.values(audioCache).forEach((audio) => {
    if (audio) {
      audio.volume = globalVolume;
    }
  });
}

/**
 * 특정 효과음 재생 함수
 */
export function playAppSound(type: AppSoundType): void {
  // 1. SSR 방지
  if (typeof window === "undefined") return;

  // 2. 음소거 상태 체크
  if (isMuted) return;

  try {
    let audio = audioCache[type];

    // 3. 캐싱 인스턴스 지연 생성
    if (!audio) {
      audio = new Audio(SOUND_PATHS[type]);
      audio.volume = globalVolume;
      audioCache[type] = audio;
    }

    // 4. 연속 재생 지원 (재생 위치 리셋)
    audio.currentTime = 0;

    // 5. 비동기 재생 호출 (브라우저 자동재생 보안 경고 우회 방어)
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        // 인터랙션 전 재생 시도 등은 콘솔 경고 처리 후 앱 기능 실패는 방지
        console.warn(`[appSound] 효과음 재생이 차단되었습니다 (사용자 반응 필요):`, err.message);
      });
    }
  } catch (err: any) {
    console.warn(`[appSound] 효과음 재생 중 오류 발생:`, err.message);
  }
}
