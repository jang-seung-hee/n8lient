import InAppBrowserGuard from "@/components/custom/InAppBrowserGuard";

export default function OpenInBrowserPage() {
  return (
    <InAppBrowserGuard>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#f3f4f6",
          padding: "24px 16px",
          boxSizing: "border-box",
        }}
      >
        <p style={{ color: "#374151", fontSize: "14px", fontWeight: 600 }}>
          정상 브라우저로 감지되었습니다. 이제 N8Lient 서비스를 편리하게 이용할 수 있습니다.
        </p>
      </div>
    </InAppBrowserGuard>
  );
}
