import { APP_NAME } from "./app";

const root = document.querySelector<HTMLElement>("#app");
if (root) root.textContent = APP_NAME;
