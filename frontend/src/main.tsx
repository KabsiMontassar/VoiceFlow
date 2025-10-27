import { createRouter } from "@tanstack/react-router";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { routeTree } from "./routeTree.gen.ts";
import "./styles/tailwind.css";
import { useWebRTCStore } from "./stores/webrtcStore.ts";

// Expose stores to window for debugging
if (import.meta.env.DEV) {
	(window as any).webrtcStore = useWebRTCStore;
	console.log('[Debug] WebRTC store exposed as window.webrtcStore');
	console.log('[Debug] Usage: window.webrtcStore.getState().debugAudioElements()');
}

const router = createRouter({ routeTree });

export type TanstackRouter = typeof router;

declare module "@tanstack/react-router" {
	interface Register {
		// This infers the type of our router and registers it across your entire project
		router: TanstackRouter;
	}
}

const rootElement = document.querySelector("#root") as Element;
if (!rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<React.StrictMode>
			<React.Suspense fallback="loading">
				<App router={router} />
			</React.Suspense>
		</React.StrictMode>
	);
}
