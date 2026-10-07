import { BrowserRouter, Routes, Route, useMatch } from "react-router-dom";
import { UploadPage } from "./pages/UploadPage.jsx";
import { PlayerPage } from "./pages/PlayerPage.jsx";
import { RequireGuestName } from "./components/RequireGuestName.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";

import { NotificationProvider } from "./components/notifications/NotificationProvider";
import { ConnectionStatus } from "./components/notifications/ConnectionStatus";

const AppContent = () => {
	const match = useMatch("/player/:fileId");
	return (
		<NotificationProvider fileId={match?.params.fileId || null}>
			<ConnectionStatus />
			<Routes>
				<Route path="/login" element={<LoginPage />} />

				<Route element={<RequireGuestName />}>
					<Route path="/" element={<UploadPage />} />
					<Route path="/player/:fileId" element={<PlayerPage />} />
				</Route>
			</Routes>
		</NotificationProvider>
	);
};

export const App = () => (
	<BrowserRouter>
		<AppContent />
	</BrowserRouter>
);
