import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { useEffect } from "react";
import type { FunctionComponent } from "./common/types";
import type { TanstackRouter } from "./main";
import { useAuthStore } from "./stores/authStore";
import { useSocketAuth } from "./hooks/useSocketAuth";

const queryClient = new QueryClient();

type AppProps = { router: TanstackRouter };

const App = ({ router }: AppProps): FunctionComponent => {
	const initializeAuth = useAuthStore((state) => state.initializeAuth);

	// Initialize socket authentication
	useSocketAuth();

	// Initialize auth on app startup
	useEffect(() => {
		initializeAuth();
	}, [initializeAuth]);

	return (
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	);
};

export default App;
