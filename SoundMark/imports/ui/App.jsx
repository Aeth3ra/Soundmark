import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UploadPage } from "./pages/UploadPage.jsx";
import { PlayerPage } from "./pages/PlayerPage.jsx";

export const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<UploadPage />} />
      <Route path="/player" element={<PlayerPage />} />
    </Routes>
  </BrowserRouter>
);
