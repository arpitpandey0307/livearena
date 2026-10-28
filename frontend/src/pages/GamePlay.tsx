import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameSocket } from '../hooks/useSocket';

export default function GamePlay() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();

  const [participantId, setParticipantId] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    joinRoom,
    submitAnswer,
    currentQuestion,
    leaderboard,
    answerStatus,
    gameStatus,
    gameState,
    isConnected,
  } = useGameSocket(roomCode || null);

  useEffect(() => {
    const storedParticipantId = sessionStorage.getItem('participantId');
    if (!storedParticipantId) {
      navigate(`/join/${roomCode}`);
      return;
    }
    setParticipantId(storedParticipantId);
  }, [roomCode, navigate]);

  useEffect(() => {
    if (participantId && isConnected) {
      joinRoom(participantId);
    }
  }, [participantId, isConnected]);

  // Timer countdown
  useEffect(() => {
    if (!currentQuestion?.deadline) return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((currentQuestion.deadline - now) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 100);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentQuestion?.deadline]);

  // Reset selection when new question starts
  useEffect(() => {
    setSelectedOption(null);
  }, [currentQuestion?.questionId]);

  // Navigate to results when game completes
  useEffect(() => {
    if (gameStatus === 'completed' && gameState?.sessionId) {
      setTimeout(() => {
        navigate(`/results/${gameState.sessionId}`);
      }, 2000);
    }
  }, [gameStatus, gameState, navigate]);

  const handleSelectOption = (optionId: string) => {
    if (answerStatus !== 'idle' || !participantId || !currentQuestion) return;

    setSelectedOption(optionId);
    submitAnswer(participantId, currentQuestion.questionId, optionId);
  };

  if (!currentQuestion) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-5xl mb-4">⏳</div>
          <p className="text-xl">Waiting for question...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-4">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-gray-600">
            Question {currentQuestion.questionIndex} of {currentQuestion.totalQuestions}
          </div>
          <div className={`text-2xl font-bold ${timeLeft <= 5 ? 'text-red-600' : 'text-gray-800'}`}>
            {timeLeft}s
          </div>
        </div>

        {/* Timer Bar */}
        <div className="h-2 bg-gray-300 rounded-full mb-6 overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ${
              timeLeft <= 5 ? 'bg-red-500' : 'bg-primary-500'
            }`}
            style={{
              width: `${(timeLeft / currentQuestion.timeLimitSeconds) * 100}%`,
            }}
          />
        </div>

        {/* Question Card */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            {currentQuestion.text}
          </h2>

          <div className="space-y-3">
            {currentQuestion.options.map((opt: any) => {
              let buttonClass = 'w-full text-left px-4 py-3 rounded-lg border-2 transition-all ';

              if (currentQuestion.ended) {
                // Show results
                if (opt.optionId === currentQuestion.correctOptionId) {
                  buttonClass += 'border-green-500 bg-green-50 text-green-800';
                } else if (opt.optionId === selectedOption) {
                  buttonClass += 'border-red-500 bg-red-50 text-red-800';
                } else {
                  buttonClass += 'border-gray-200 bg-gray-50 text-gray-500';
                }
              } else if (selectedOption === opt.optionId) {
                buttonClass += 'border-primary-500 bg-primary-50 text-primary-800';
              } else if (answerStatus !== 'idle') {
                buttonClass += 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed';
              } else {
                buttonClass += 'border-gray-200 hover:border-primary-400 hover:bg-primary-50';
              }

              return (
                <button
                  key={opt.optionId}
                  onClick={() => handleSelectOption(opt.optionId)}
                  disabled={answerStatus !== 'idle'}
                  className={buttonClass}
                >
                  <span className="font-medium mr-2">{opt.optionId.toUpperCase()}.</span>
                  {opt.text}
                </button>
              );
            })}
          </div>

          {/* Answer Status */}
          {answerStatus === 'accepted' && !currentQuestion.ended && (
            <div className="mt-4 text-green-600 text-center font-medium">
              ✓ Answer submitted! Waiting for others...
            </div>
          )}

          {/* Explanation */}
          {currentQuestion.ended && currentQuestion.explanation && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-blue-800 text-sm">
              <strong>Explanation:</strong> {currentQuestion.explanation}
            </div>
          )}
        </div>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-3">Leaderboard</h3>
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((p: any, index: number) => (
                <div
                  key={p.participantId}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                    p.participantId === participantId ? 'bg-primary-50' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${
                      index === 0 ? 'text-yellow-600' :
                      index === 1 ? 'text-gray-500' :
                      index === 2 ? 'text-orange-600' :
                      'text-gray-600'
                    }`}>
                      #{index + 1}
                    </span>
                    <span className="text-gray-800">{p.nickname}</span>
                  </div>
                  <span className="font-semibold text-gray-800">{p.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Game Complete Message */}
        {gameStatus === 'completed' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="card text-center max-w-md mx-4">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Game Complete!</h2>
              <p className="text-gray-600">Redirecting to results...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
