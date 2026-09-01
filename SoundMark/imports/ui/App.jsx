import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UploadPage } from "./pages/UploadPage.jsx";
import { PlayerPage } from "./pages/PlayerPage.jsx";
import { RequireGuestName } from "./components/RequireGuestName.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";

export const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireGuestName />}>
        <Route path="/" element={<UploadPage />} />
        <Route path="/player/:fileId" element={<PlayerPage />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
