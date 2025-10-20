import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "@tanstack/react-router";
import { useEffect } from "react";
import type { FunctionComponent } from "./common/types";
import type { TanstackRouter } from "./main";
import { TanStackRouterDevelopmentTools } from "./components/utils/development-tools/TanStackRouterDevelopmentTools";
import { useAuthStore } from "./stores/authStore";

const queryClient = new QueryClient();

type AppProps = { router: TanstackRouter };

const App = ({ router }: AppProps): FunctionComponent => {
	const initializeAuth = useAuthStore((state) => state.initializeAuth);

	// Initialize auth on app startup
	useEffect(() => {
		initializeAuth();
	}, [initializeAuth]);

	return (
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
			<TanStackRouterDevelopmentTools
				initialIsOpen={false}
				position="bottom-left"
				router={router}
			/>
			<ReactQueryDevtools initialIsOpen={false} position="bottom" />
		</QueryClientProvider>
	);
};

export default App;
