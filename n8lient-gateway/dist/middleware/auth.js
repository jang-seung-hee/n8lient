"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAuth = checkAuth;
const firebase_1 = require("../lib/firebase");
/**
 * Firebase ID Token 인증 검증 미들웨어
 */
async function checkAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, error: "인증 토큰이 없습니다." });
        }
        const idToken = authHeader.replace("Bearer ", "");
        const decodedToken = await (0, firebase_1.getAdminAuth)().verifyIdToken(idToken);
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
        };
        return next();
    }
    catch (error) {
        console.error("[checkAuth] 인증 검증 실패:", error);
        return res.status(401).json({ success: false, error: "유효하지 않은 인증 토큰입니다." });
    }
}
