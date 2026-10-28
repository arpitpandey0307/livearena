import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { sessionApi, SessionResult } from '../services/api';

export default function Results() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [results, setResults] = useState<SessionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      loadResults();
    }
  }, [sessionId]);

  const loadResults = async () => {
    try {
      const data = await sessionApi.getResults(sessionId!);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-white text-xl">Loading results...</div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="card text-center">
          <p className="text-red-600 mb-4">{error || 'Results not found'}</p>
          <Link to="/" className="btn-primary">Go Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="text-4xl font-bold text-white mb-2">Quiz Complete!</h1>
          <p className="text-white/90">{results.quizTitle}</p>
        </div>

        {/* Winner Card */}
        {results.participants.length > 0 && (
          <div className="card mb-6 text-center">
            <div className="mb-4">
              <div className="text-5xl mb-2">🥇</div>
              <h2 className="text-2xl font-bold text-gray-800">{results.participants[0].nickname}</h2>
              <p className="text-3xl font-bold text-primary-600 mt-1">{results.participants[0].score} points</p>
              <p className="text-gray-600 text-sm mt-1">
                {results.participants[0].correctAnswers} correct answers
              </p>
            </div>
          </div>
        )}

        {/* Full Leaderboard */}
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Final Standings</h3>

          {results.participants.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No participants</p>
          ) : (
            <div className="space-y-2">
              {results.participants.map((p, index) => (
                <div
                  key={p.participantId}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg ${
                    index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                    index === 1 ? 'bg-gray-100' :
                    index === 2 ? 'bg-orange-50' :
                    'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-400 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-orange-400 text-white' :
                      'bg-gray-300 text-gray-700'
                    }`}>
                      {p.rank}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{p.nickname}</div>
                      <div className="text-sm text-gray-500">
                        {p.correctAnswers}/{p.totalAnswered} correct
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-gray-800">{p.score}</div>
                    <div className="text-sm text-gray-500">points</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="text-center">
          <Link to="/" className="btn-primary inline-block">
            Play Again
          </Link>
        </div>

        {/* Session Info */}
        <div className="mt-8 text-center text-white/70 text-sm">
          <p>Session ID: {sessionId}</p>
          {results.completedAt && (
            <p>Completed: {new Date(results.completedAt).toLocaleString()}</p>
          )}
        </div>
      </div>
    </div>
  );
}
