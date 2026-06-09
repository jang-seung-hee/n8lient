import { Request, Response, NextFunction } from "express";
import { getAdminAuth } from "../lib/firebase";

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    [key: string]: any;
  };
}

/**
 * Firebase ID Token 인증 검증 미들웨어
 */
export async function checkAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "인증 토큰이 없습니다." });
    }

    const idToken = authHeader.replace("Bearer ", "");
    const decodedToken = await getAdminAuth().verifyIdToken(idToken);
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
    
    return next();
  } catch (error: any) {
    console.error("[checkAuth] 인증 검증 실패:", error);
    return res.status(401).json({ success: false, error: "유효하지 않은 인증 토큰입니다." });
  }
}
