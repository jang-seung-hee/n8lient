// 마이크 권한 상태 조회 및 유틸리티
// 한국어 주석 표준을 준수합니다.

export type MicrophonePermissionState =
  | "granted"
  | "prompt"
  | "denied"
  | "unsupported"
  | "unknown";

export async function getMicrophonePermissionState(): Promise<MicrophonePermissionState> {
  if (typeof navigator === "undefined") return "unsupported";

  try {
    if (!navigator.permissions?.query) return "unsupported";

    const result = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });

    return result.state;
  } catch {
    return "unknown";
  }
}
