import "./ui/style.css";
import { localToday, startApp } from "./start";

let storage: Storage | null = null;
try {
  storage = window.localStorage;
} catch {
  storage = null;
}

startApp(document, { today: localToday(), storage, clock: localToday });
