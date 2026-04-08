import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { RoomPage } from './pages/RoomPage';
import { EndedPage } from './pages/EndedPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/c/:code" element={<RoomPage />} />
        <Route path="/room/:id" element={<RoomPage />} />
        <Route path="/ended" element={<EndedPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
