import "./styles/main.css";
import { ScreenManager } from "./core/screen.ts";
import { createEntryScreen } from "./screens/entryScreen.ts";

const root = document.getElementById("app")!;
const manager = new ScreenManager(root);
manager.go(createEntryScreen);
