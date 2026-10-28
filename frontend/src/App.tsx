import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import CreateQuiz from './pages/CreateQuiz';
import AIGenerateQuiz from './pages/AIGenerateQuiz';
import QuizEditor from './pages/QuizEditor';
import HostLobby from './pages/HostLobby';
import JoinRoom from './pages/JoinRoom';
import PlayerLobby from './pages/PlayerLobby';
import GamePlay from './pages/GamePlay';
import Results from './pages/Results';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/create" element={<CreateQuiz />} />
          <Route path="/create/ai" element={<AIGenerateQuiz />} />
          <Route path="/quiz/:quizId/edit" element={<QuizEditor />} />
          <Route path="/host/:roomCode" element={<HostLobby />} />
          <Route path="/join" element={<JoinRoom />} />
          <Route path="/join/:roomCode" element={<JoinRoom />} />
          <Route path="/lobby/:roomCode" element={<PlayerLobby />} />
          <Route path="/game/:roomCode" element={<GamePlay />} />
          <Route path="/results/:sessionId" element={<Results />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
