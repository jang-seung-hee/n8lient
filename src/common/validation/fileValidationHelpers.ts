// 파일 유효성 검증을 위한 헬퍼 함수 모음
// 한국어 주석 표준을 준수합니다.

export const getFileExtension = (filename: string): string => {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";
};

export const normalizeAllowedExtensions = (types?: string[]): string[] => {
  if (!types) return [];
  return types.map((t) => t.replace(/^\./, "").trim().toLowerCase());
};

export const isAllowedByExtension = (fileExt: string, allowedExts: string[]): boolean => {
  return allowedExts.includes(fileExt);
};

export const isAllowedByMime = (fileMime: string, allowedExts: string[]): boolean => {
  const mimeMap: Record<string, string[]> = {
    mp3: ["audio/mpeg", "audio/mp3", "audio/x-mp3"],
    webm: ["audio/webm", "video/webm"],
    m4a: ["audio/mp4", "audio/x-m4a", "audio/m4a"],
    wav: ["audio/wav", "audio/wave", "audio/x-wav"],
  };

  const lowercaseMime = fileMime.toLowerCase();

  for (const ext of allowedExts) {
    const candidates = mimeMap[ext];
    if (candidates && candidates.includes(lowercaseMime)) {
      return true;
    }
  }

  for (const ext of allowedExts) {
    if (ext === "audio" && lowercaseMime.startsWith("audio/")) return true;
    if (ext === "image" && lowercaseMime.startsWith("image/")) return true;
    if (ext === "video" && lowercaseMime.startsWith("video/")) return true;
    
    const regexStr = ext.replace("*", ".*");
    if (lowercaseMime.match(new RegExp(regexStr))) {
      return true;
    }
  }

  return false;
};
