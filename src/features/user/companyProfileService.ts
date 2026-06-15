/**
 * 이 파일은 일반 사용자가 소속 회사의 공개 프로필(clientPublicProfiles)을 안전하게 조회할 수 있도록 돕는 Firestore 서비스를 제공합니다.
 * 보안을 준수하여 clients 컬렉션은 절대 읽지 않습니다.
 * 한국어 주석 표준을 준수합니다.
 */

import { doc, getDoc, Firestore } from "firebase/firestore";
import type { ClientPublicProfile } from "@/types/n8lient";

/**
 * 로그인한 사용자의 clientId에 해당하는 회사 공개 프로필을 단건 조회합니다.
 * 문서가 존재하지 않는 경우 null을 반환합니다.
 */
export async function getMyCompanyPublicProfile(
  db: Firestore,
  clientId: string
): Promise<ClientPublicProfile | null> {
  try {
    const docRef = doc(db, "clientPublicProfiles", clientId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as ClientPublicProfile;
    }
    return null;
  } catch (error) {
    console.error("[companyProfileService] 회사 공개 프로필 조회 실패:", error);
    throw error;
  }
}
