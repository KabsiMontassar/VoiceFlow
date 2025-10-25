import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		TanStackRouterVite({
			routesDirectory: "./src/routes",
			generatedRouteTree: "./src/routeTree.gen.ts",
		}),
	],
	server: {
		host: true,
		strictPort: true,
		port: 5173,
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					// React and core dependencies
					'react-vendor': ['react', 'react-dom'],
					
					// TanStack ecosystem
					'tanstack-router': ['@tanstack/react-router'],
					'tanstack-query': ['@tanstack/react-query'],
					
					// State management
					'zustand': ['zustand'],
					
					// Socket.IO
					'socket-io': ['socket.io-client'],
					
					// UI libraries
					'ui-libs': [
						'lucide-react',
						'react-hook-form',
						'@hookform/resolvers',
						'zod'
					],
					
					// HTTP client
					'axios': ['axios'],
				},
			},
		},
		// Increase chunk size warning limit to 600kb (from default 500kb)
		chunkSizeWarningLimit: 600,
		
		// Enable minification
		minify: 'terser',
		
	},
});