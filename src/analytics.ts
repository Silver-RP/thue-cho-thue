/** Analytics tắt mặc định. Đây là file duy nhất trong src/ được dùng API mạng. */

export type Transport = (url: string, body: string) => void;

export interface Analytics {
  enabled: boolean;
  track(event: string, path: string): void;
}

export interface AnalyticsOptions {
  url?: string;
  transport?: Transport;
}

const DISABLED: Analytics = { enabled: false, track: () => {} };

function defaultTransport(url: string, body: string): void {
  const blob = new Blob([body], { type: "text/plain" });
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    if (navigator.sendBeacon(url, blob)) return;
  }
  void globalThis.fetch(url, { method: "POST", body, keepalive: true });
}

export function createAnalytics(opts: AnalyticsOptions = {}): Analytics {
  const url = (opts.url ?? "").trim();
  if (url === "") return { enabled: false, track: () => {} };
  const transport = opts.transport ?? defaultTransport;
  return {
    enabled: true,
    track(event, path) {
      try {
        // Payload chỉ gồm tên sự kiện và đường dẫn, không bao giờ dữ liệu sổ/máy tính.
        transport(url, JSON.stringify({ event: String(event), path: String(path) }));
      } catch {
        // lỗi analytics không được làm hỏng trang
      }
    },
  };
}

/** Đọc VITE_ANALYTICS_URL lúc build; rỗng thì nhánh gọi mạng bị loại khỏi bundle. */
export function analyticsFromEnv(): Analytics {
  if (!import.meta.env.VITE_ANALYTICS_URL) return DISABLED;
  return createAnalytics({ url: import.meta.env.VITE_ANALYTICS_URL });
}
