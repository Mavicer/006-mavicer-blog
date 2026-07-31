import React from "react";

/**
 * Global ErrorBoundary — catches render-phase errors that would otherwise
 * unmount the entire React tree (white screen). Shows a minimal fallback UI
 * instead. Event-handler errors (API failures) are NOT caught here — those
 * are handled by try/catch in the calling components.
 */
interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            fontFamily: "system-ui, sans-serif",
            color: "#666",
          }}
        >
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
            页面出了点问题
          </h2>
          <p style={{ fontSize: "0.9rem" }}>
            {this.state.error?.message || "未知错误"}
          </p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={() => (window.location.href = "/")}
              style={{
                padding: "0.5rem 1.2rem",
                borderRadius: "8px",
                border: "1px solid #ddd",
                background: "transparent",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              返回首页
            </button>
            <button
              onClick={this.handleReset}
              style={{
                padding: "0.5rem 1.2rem",
                borderRadius: "8px",
                border: "none",
                background: "#A31F34",
                color: "#fff",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
