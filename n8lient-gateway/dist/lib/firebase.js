"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminApp = getAdminApp;
exports.getAdminFirestore = getAdminFirestore;
exports.getAdminAuth = getAdminAuth;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
let adminApp = null;
/**
 * Firebase Admin SDK 앱 인스턴스를 반환합니다.
 */
function getAdminApp() {
    if (adminApp)
        return adminApp;
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    if (!projectId || !clientEmail || !privateKey) {
        throw new Error("[firebaseAdmin] 서버 환경변수가 누락되었습니다. FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY를 확인하세요.");
    }
    if (firebase_admin_1.default.apps.length > 0) {
        adminApp = firebase_admin_1.default.apps[0];
        return adminApp;
    }
    adminApp = firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
    });
    return adminApp;
}
/**
 * Firebase Admin Firestore 인스턴스를 반환합니다.
 */
function getAdminFirestore() {
    const app = getAdminApp();
    return firebase_admin_1.default.firestore(app);
}
/**
 * Firebase Admin Auth 인스턴스를 반환합니다.
 */
function getAdminAuth() {
    const app = getAdminApp();
    return firebase_admin_1.default.auth(app);
}
