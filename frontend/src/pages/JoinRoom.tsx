import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { roomApi } from '../services/api';

export default function JoinRoom() {
  const { roomCode: urlRoomCode } = useParams<{ roomCode?: string }>();
  const navigate = useNavigate();

  const [roomCode, setRoomCode] = useState(urlRoomCode || '');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomInfo, setRoomInfo] = useState<any>(null);

  useEffect(() => {
    if (urlRoomCode) {
      validateRoom(urlRoomCode);
    }
  }, [urlRoomCode]);

  const validateRoom = async (code: string) => {
    setValidating(true);
    setError(null);

    try {
      const info = await roomApi.getInfo(code);
      setRoomInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Room not found');
      setRoomInfo(null);
    } finally {
      setValidating(false);
    }
  };

  const handleRoomCodeChange = (value: string) => {
    const code = value.toUpperCase();
    setRoomCode(code);
    setError(null);
    setRoomInfo(null);

    if (code.length === 6) {
      validateRoom(code);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roomInfo) return;

    setLoading(true);
    setError(null);

    try {
      const result = await roomApi.join(roomCode, nickname);

      // Store participant info in session storage
      sessionStorage.setItem('participantId', result.participantId);
      sessionStorage.setItem('roomCode', result.roomCode);
      sessionStorage.setItem('nickname', nickname);

      // Navigate to player lobby
      navigate(`/lobby/${roomCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center py-8 px-4">
      <div className="card w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Join Quiz</h1>
          <p className="text-gray-600 mt-2">Enter your details to join the game</p>
        </div>

        <form onSubmit={handleJoin}>
          {/* Room Code */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Code
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => handleRoomCodeChange(e.target.value)}
              className="input-field text-center uppercase text-lg tracking-wider"
              placeholder="Enter 6-character code"
              maxLength={6}
              disabled={!!urlRoomCode}
            />
            {validating && (
              <p className="text-sm text-gray-500 mt-1">Validating room...</p>
            )}
          </div>

          {/* Room Info */}
          {roomInfo && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-green-800">{roomInfo.quizTitle}</h3>
              <p className="text-sm text-green-700 mt-1">
                {roomInfo.participantCount} participant(s) waiting
              </p>
            </div>
          )}

          {/* Nickname */}
          {roomInfo && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Nickname
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="input-field"
                placeholder="Enter your nickname"
                maxLength={50}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!roomInfo || !nickname.trim() || loading}
            className="btn-primary w-full"
          >
            {loading ? 'Joining...' : 'Join Quiz'}
          </button>
        </form>
      </div>
    </div>
  );
}
