import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function LandingPage() {
  const [roomCode, setRoomCode] = useState('');

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">LiveArena</h1>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-6">
            Create. Host. Compete.
          </h2>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Real-time multiplayer quiz platform with AI-powered question generation.
            Create engaging quizzes, invite participants, and host live competitions.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Create Quiz Card */}
          <div className="card hover:shadow-xl transition-shadow">
            <div className="text-center">
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Create a Quiz</h3>
              <p className="text-gray-600 mb-6">
                Build your quiz manually or let AI generate questions for you
              </p>

              <div className="space-y-3">
                <Link
                  to="/create"
                  className="btn-primary w-full block text-center"
                >
                  Create Manually
                </Link>
                <Link
                  to="/create/ai"
                  className="btn-accent w-full block text-center"
                >
                  Generate with AI
                </Link>
              </div>
            </div>
          </div>

          {/* Join Quiz Card */}
          <div className="card hover:shadow-xl transition-shadow">
            <div className="text-center">
              <div className="text-5xl mb-4">🎮</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Join a Quiz</h3>
              <p className="text-gray-600 mb-6">
                Enter a room code to join an active quiz session
              </p>

              <form className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter room code (e.g., ABC123)"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="input-field text-center uppercase text-lg tracking-wider"
                  maxLength={6}
                />
                <Link
                  to={roomCode.length === 6 ? `/join/${roomCode}` : '#'}
                  className={`btn-primary w-full block text-center ${
                    roomCode.length !== 6 ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  Join Quiz
                </Link>
              </form>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid md:grid-cols-3 gap-8 text-center">
          <div className="text-white">
            <div className="text-4xl mb-3">⚡</div>
            <h4 className="font-semibold text-lg mb-2">Real-time Sync</h4>
            <p className="text-white/80 text-sm">
              Questions, timers, and leaderboards synchronized across all participants
            </p>
          </div>
          <div className="text-white">
            <div className="text-4xl mb-3">🤖</div>
            <h4 className="font-semibold text-lg mb-2">AI Generation</h4>
            <p className="text-white/80 text-sm">
              Generate quality questions from any topic with AI assistance
            </p>
          </div>
          <div className="text-white">
            <div className="text-4xl mb-3">📊</div>
            <h4 className="font-semibold text-lg mb-2">Live Leaderboard</h4>
            <p className="text-white/80 text-sm">
              Track scores in real-time and see final rankings
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/10 backdrop-blur-sm mt-20 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-white/80 text-sm">
          <p>LiveArena — Real-time Multiplayer Quiz Platform</p>
        </div>
      </footer>
    </div>
  );
}
