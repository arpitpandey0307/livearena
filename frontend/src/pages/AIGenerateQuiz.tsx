import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { quizApi } from '../services/api';

export default function AIGenerateQuiz() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questionCount, setQuestionCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setLoading(true);
    try {
      const quiz = await quizApi.generate({
        topic,
        description: description || undefined,
        difficulty,
        questionCount,
      });

      // Navigate to editor with generated quiz
      navigate(`/quiz/${quiz._id}/edit`, { state: { generated: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Generate Quiz with AI</h1>
          <p className="text-gray-600 mt-2">Let AI create questions for you on any topic</p>
        </div>

        <form onSubmit={handleSubmit} className="card">
          {/* Topic */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Topic *
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="input-field"
              placeholder="e.g., JavaScript fundamentals, World War II, Photosynthesis"
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Context or Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              rows={3}
              placeholder="Add context to help AI generate better questions..."
              maxLength={1000}
            />
          </div>

          {/* Difficulty */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Difficulty
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['easy', 'medium', 'hard'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={`py-3 px-4 rounded-lg border-2 font-medium transition-colors ${
                    difficulty === level
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Question Count */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Questions
            </label>
            <input
              type="number"
              value={questionCount}
              onChange={(e) => setQuestionCount(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
              className="input-field w-32"
              min={1}
              max={30}
            />
            <p className="text-sm text-gray-500 mt-1">Between 1 and 30 questions</p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="bg-primary-50 border border-primary-200 text-primary-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating questions... This may take a moment.
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-4">
            <Link to="/" className="btn-secondary flex-1 text-center">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="btn-accent flex-1"
            >
              {loading ? 'Generating...' : 'Generate Quiz'}
            </button>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">💡 Tips for better results:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Be specific with your topic (e.g., "ES6 arrow functions" instead of just "JavaScript")</li>
            <li>• Add context if the topic could be interpreted multiple ways</li>
            <li>• You can edit all generated questions before publishing</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
