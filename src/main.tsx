import { createRoot } from "react-dom/client";
import { Buffer } from "buffer";
import App from "./App.tsx";
import "./index.css";

// Ensure Buffer exists for Solana/Metaplex libs in the browser.
(globalThis as any).Buffer = (globalThis as any).Buffer ?? Buffer;

createRoot(document.getElementById("root")!).render(<App />);

