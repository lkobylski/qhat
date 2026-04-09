import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { RoomPage } from './pages/RoomPage';
import { PublicLobbyPage } from './pages/PublicLobbyPage';
import { EndedPage } from './pages/EndedPage';
import { PrivacyPage } from './pages/PrivacyPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/lobby" element={<PublicLobbyPage />} />
        <Route path="/c/:code" element={<RoomPage />} />
        <Route path="/room/:id" element={<RoomPage />} />
        <Route path="/ended" element={<EndedPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
