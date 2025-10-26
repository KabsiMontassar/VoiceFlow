import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import type { FunctionComponent } from "./common/types";
import type { TanstackRouter } from "./main";
import { useSocketAuth } from "./hooks/useSocketAuth";
import { useRoomsSync } from "./hooks/useRoomsSync";
import ToastContainer from "./components/ui/ToastContainer";

const queryClient = new QueryClient();

type AppProps = { router: TanstackRouter };

// Inner component that uses hooks requiring QueryClient
const AppContent = ({ router }: AppProps): FunctionComponent => {
	// Initialize socket authentication (only connects if authenticated)
	useSocketAuth();
	
	// Initialize global rooms synchronization (only fetches if authenticated)
	useRoomsSync();

	// Auth initialization is handled by Zustand's onRehydrateStorage callback
	// No need to call it again here

	return (
		<>
			<RouterProvider router={router} />
			<ToastContainer />
		</>
	);
};

const App = ({ router }: AppProps): FunctionComponent => {
	return (
		<QueryClientProvider client={queryClient}>
			<AppContent router={router} />
		</QueryClientProvider>
	);
};

export default App;
