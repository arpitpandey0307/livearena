import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useGameSocket } from '../hooks/useSocket';

export default function HostLobby() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const location = useLocation();
  const { hostToken, invitationUrl, quizTitle } = location.state || {};

  const { joinAsHost, startGame, roomState, isConnected } = useGameSocket(roomCode || null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (roomCode && hostToken && isConnected) {
      joinAsHost(hostToken);
    }
  }, [roomCode, hostToken, isConnected]);

  const handleStart = async () => {
    if (!hostToken) return;
    setStarting(true);
    startGame(hostToken);
  };

  if (!hostToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Invalid session. Please create a room from the quiz editor.</p>
          <Link to="/" className="btn-primary">Go Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Host Lobby</h1>
          <p className="text-gray-600">{quizTitle || 'Quiz'}</p>
        </div>

        {/* Room Code & QR */}
        <div className="card mb-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Room Code */}
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Room Code</h2>
              <div className="text-6xl font-bold tracking-wider text-primary-600 mb-4">
                {roomCode}
              </div>
              <p className="text-gray-500 text-sm">Share this code with participants</p>
            </div>

            {/* QR Code */}
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Scan to Join</h2>
              <div className="inline-block bg-white p-4 rounded-lg shadow">
                <QRCodeSVG
                  value={invitationUrl || `http://localhost:5173/join/${roomCode}`}
                  size={180}
                  level="H"
                />
              </div>
              <p className="text-gray-500 text-sm mt-2">Scan QR code to join</p>
            </div>
          </div>

          {/* Invitation Link */}
          <div className="mt-6 pt-6 border-t">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invitation Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={invitationUrl || `http://localhost:5173/join/${roomCode}`}
                className="input-field flex-1 bg-gray-50"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(invitationUrl || `http://localhost:5173/join/${roomCode}`);
                  alert('Link copied!');
                }}
                className="btn-secondary"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        {/* Participants List */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Participants ({roomState?.participants?.length || 0})
          </h2>

          {roomState?.participants?.length > 0 ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {roomState.participants.map((p: any) => (
                <div
                  key={p.participantId}
                  className="bg-gray-50 px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-gray-800">{p.nickname}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Waiting for participants to join...
            </p>
          )}
        </div>

        {/* Start Button */}
        <div className="text-center">
          <button
            onClick={handleStart}
            disabled={starting || !isConnected || !roomState?.participants?.length}
            className="btn-primary text-lg px-12 py-4"
          >
            {starting ? 'Starting...' : 'Start Quiz'}
          </button>
          {!roomState?.participants?.length && (
            <p className="text-gray-500 text-sm mt-2">
              Wait for at least one participant to join
            </p>
          )}
        </div>

        {/* Connection Status */}
        <div className="mt-8 text-center">
          <span className={`inline-flex items-center gap-2 text-sm ${
            isConnected ? 'text-green-600' : 'text-red-600'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
}
