import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/shared/Toast';
import { LandingPage } from './pages/LandingPage';
import { RoomPage } from './pages/RoomPage';
import { PublicLobbyPage } from './pages/PublicLobbyPage';
import { EndedPage } from './pages/EndedPage';
import { HistoryPage } from './pages/HistoryPage';
import { PrivacyPage } from './pages/PrivacyPage';

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/lobby" element={<PublicLobbyPage />} />
          <Route path="/c/:code" element={<RoomPage />} />
          <Route path="/room/:id" element={<RoomPage />} />
          <Route path="/ended" element={<EndedPage />} />
          <Route path="/history/:code" element={<HistoryPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
