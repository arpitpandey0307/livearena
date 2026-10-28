import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { quizApi, roomApi, Quiz, Question } from '../services/api';

export default function QuizEditor() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isGenerated = location.state?.generated;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (quizId) {
      loadQuiz();
    }
  }, [quizId]);

  const loadQuiz = async () => {
    try {
      const data = await quizApi.getById(quizId!);
      setQuiz(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    if (!quiz) return;
    const newQuestions = [...quiz.questions];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    setQuiz({ ...quiz, questions: newQuestions });
  };

  const updateOption = (qIndex: number, oIndex: number, text: string) => {
    if (!quiz) return;
    const newQuestions = [...quiz.questions];
    const options = [...newQuestions[qIndex].options];
    options[oIndex] = { ...options[oIndex], text };
    newQuestions[qIndex] = { ...newQuestions[qIndex], options };
    setQuiz({ ...quiz, questions: newQuestions });
  };

  const addQuestion = () => {
    if (!quiz) return;
    const newQuestion: Question = {
      questionId: `q${quiz.questions.length + 1}`,
      text: '',
      options: [
        { optionId: 'a', text: '' },
        { optionId: 'b', text: '' },
        { optionId: 'c', text: '' },
        { optionId: 'd', text: '' },
      ],
      correctOptionId: 'a',
      timeLimitSeconds: 20,
    };
    setQuiz({ ...quiz, questions: [...quiz.questions, newQuestion] });
  };

  const removeQuestion = (index: number) => {
    if (!quiz || quiz.questions.length <= 1) return;
    const newQuestions = quiz.questions.filter((_, i) => i !== index);
    setQuiz({ ...quiz, questions: newQuestions });
  };

  const handleSave = async () => {
    if (!quiz) return;
    setSaving(true);
    setError(null);

    try {
      await quizApi.update(quizId!, {
        title: quiz.title,
        description: quiz.description,
        questions: quiz.questions,
      });
      alert('Quiz saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  const handleHostQuiz = async () => {
    if (!quiz) return;
    setCreatingRoom(true);
    setError(null);

    try {
      // Save first
      await quizApi.update(quizId!, {
        title: quiz.title,
        description: quiz.description,
        questions: quiz.questions,
      });

      // Create room
      const room = await roomApi.create(quizId!);

      // Navigate to host lobby
      navigate(`/host/${room.roomCode}`, {
        state: {
          hostToken: room.hostToken,
          invitationUrl: room.invitationUrl,
          quizTitle: room.quizTitle,
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setCreatingRoom(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading quiz...</div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Quiz not found'}</p>
          <Link to="/" className="btn-primary">Go Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link to="/" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
            ← Back to Home
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Quiz Editor</h1>
              {isGenerated && (
                <span className="inline-block bg-green-100 text-green-700 text-sm px-2 py-1 rounded mt-2">
                  ✓ AI Generated - Review and Edit
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-secondary"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleHostQuiz}
                disabled={creatingRoom}
                className="btn-primary"
              >
                {creatingRoom ? 'Creating Room...' : 'Host Live Quiz'}
              </button>
            </div>
          </div>
        </div>

        {/* Quiz Info */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quiz Details</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={quiz.title}
                onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select
                value={quiz.difficulty}
                onChange={(e) => setQuiz({ ...quiz, difficulty: e.target.value as any })}
                className="input-field"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={quiz.description || ''}
              onChange={(e) => setQuiz({ ...quiz, description: e.target.value })}
              className="input-field"
              rows={2}
            />
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {quiz.questions.map((q, qIndex) => (
            <div key={qIndex} className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Question {qIndex + 1}</h3>
                <button
                  type="button"
                  onClick={() => removeQuestion(qIndex)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                  <textarea
                    value={q.text}
                    onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
                    className="input-field"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                  <div className="space-y-2">
                    {q.options.map((opt, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${qIndex}`}
                          checked={q.correctOptionId === opt.optionId}
                          onChange={() => updateQuestion(qIndex, { correctOptionId: opt.optionId })}
                          className="w-4 h-4 text-primary-600"
                        />
                        <span className="font-medium w-6">{opt.optionId.toUpperCase()}.</span>
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                          className="input-field flex-1"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Select the radio button for the correct answer</p>
                </div>

                <div className="flex gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time (sec)</label>
                    <input
                      type="number"
                      value={q.timeLimitSeconds}
                      onChange={(e) => updateQuestion(qIndex, { timeLimitSeconds: parseInt(e.target.value) })}
                      className="input-field w-24"
                      min={5}
                      max={120}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Explanation (optional)</label>
                    <input
                      type="text"
                      value={q.explanation || ''}
                      onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value })}
                      className="input-field"
                      placeholder="Why is this correct?"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Question */}
        <button
          onClick={addQuestion}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-500 transition-colors mt-6"
        >
          + Add Question
        </button>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mt-6">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
