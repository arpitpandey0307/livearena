import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameSocket } from '../hooks/useSocket';

export default function PlayerLobby() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();

  const [participantId, setParticipantId] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>('');

  const { joinRoom, roomState, isConnected, gameStatus } = useGameSocket(roomCode || null);

  useEffect(() => {
    // Get participant info from session storage
    const storedParticipantId = sessionStorage.getItem('participantId');
    const storedNickname = sessionStorage.getItem('nickname');

    if (!storedParticipantId || !storedNickname) {
      navigate(`/join/${roomCode}`);
      return;
    }

    setParticipantId(storedParticipantId);
    setNickname(storedNickname);
  }, [roomCode, navigate]);

  useEffect(() => {
    if (participantId && isConnected) {
      joinRoom(participantId);
    }
  }, [participantId, isConnected]);

  // Redirect when game starts
  useEffect(() => {
    if (gameStatus === 'active') {
      navigate(`/game/${roomCode}`);
    }
  }, [gameStatus, roomCode, navigate]);

  if (!participantId) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center py-8 px-4">
      <div className="card w-full max-w-md text-center">
        {/* Header */}
        <div className="mb-6">
          <div className="text-5xl mb-4">🎮</div>
          <h1 className="text-2xl font-bold text-gray-800">You're in!</h1>
          <p className="text-gray-600 mt-2">Waiting for the host to start...</p>
        </div>

        {/* Player Info */}
        <div className="bg-primary-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-primary-600 mb-1">Playing as</p>
          <p className="text-xl font-semibold text-primary-800">{nickname}</p>
        </div>

        {/* Room Code */}
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-1">Room Code</p>
          <p className="text-2xl font-bold tracking-wider text-gray-800">{roomCode}</p>
        </div>

        {/* Participants */}
        {roomState?.participants && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">
              {roomState.participants.length} participant(s)
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {roomState.participants.map((p: any) => (
                <span
                  key={p.participantId}
                  className={`px-3 py-1 rounded-full text-sm ${
                    p.participantId === participantId
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {p.nickname}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Waiting Animation */}
        <div className="flex items-center justify-center gap-1">
          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>

        {/* Connection Status */}
        <div className="mt-6">
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
