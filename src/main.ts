import "./ui/style.css";
import { localToday, startApp } from "./start";

let storage: Storage | null = null;
try {
  storage = window.localStorage;
} catch {
  storage = null;
}

// localToday lỗi (Intl hỏng) thì vẫn mở được máy tính: lấy ngày UTC làm tạm, hẹn giờ sẽ đọc lại bằng localToday.
let today: string;
try {
  today = localToday();
} catch {
  today = new Date().toISOString().slice(0, 10);
}

startApp(document, { today, storage, clock: localToday });
