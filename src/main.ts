import "./ui/style.css";
import { mountCalculator } from "./ui/form";

const root = document.querySelector<HTMLElement>("#app");
if (root) mountCalculator(root, { year: 2026 });
