import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { quizApi, Question } from '../services/api';

export default function CreateQuiz() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questions, setQuestions] = useState<Partial<Question>[]>([
    {
      text: '',
      options: [
        { optionId: 'a', text: '' },
        { optionId: 'b', text: '' },
        { optionId: 'c', text: '' },
        { optionId: 'd', text: '' },
      ],
      correctOptionId: 'a',
      timeLimitSeconds: 20,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        text: '',
        options: [
          { optionId: 'a', text: '' },
          { optionId: 'b', text: '' },
          { optionId: 'c', text: '' },
          { optionId: 'd', text: '' },
        ],
        correctOptionId: 'a',
        timeLimitSeconds: 20,
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    setQuestions(newQuestions);
  };

  const updateOption = (qIndex: number, oIndex: number, text: string) => {
    const newQuestions = [...questions];
    const options = [...(newQuestions[qIndex].options || [])];
    options[oIndex] = { ...options[oIndex], text };
    newQuestions[qIndex] = { ...newQuestions[qIndex], options };
    setQuestions(newQuestions);
  };

  const validateQuiz = (): string | null => {
    if (!title.trim()) return 'Quiz title is required';
    if (questions.length === 0) return 'At least one question is required';

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text?.trim()) return `Question ${i + 1}: Question text is required`;

      for (let j = 0; j < (q.options?.length || 0); j++) {
        if (!q.options?.[j].text.trim()) {
          return `Question ${i + 1}: Option ${String.fromCharCode(97 + j)} is required`;
        }
      }

      if (!q.correctOptionId) {
        return `Question ${i + 1}: Correct answer must be selected`;
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateQuiz();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const quiz = await quizApi.create({
        title,
        description: description || undefined,
        source: 'manual',
        difficulty,
        questions: questions.map((q, index) => ({
          questionId: `q${index + 1}`,
          text: q.text!,
          options: q.options!,
          correctOptionId: q.correctOptionId!,
          explanation: q.explanation,
          timeLimitSeconds: q.timeLimitSeconds || 20,
        })),
      });

      navigate(`/quiz/${quiz._id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Create Quiz Manually</h1>
          <p className="text-gray-600 mt-2">Build your quiz question by question</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Quiz Info */}
          <div className="card mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Quiz Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quiz Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field"
                  placeholder="e.g., JavaScript Fundamentals"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field"
                  rows={3}
                  placeholder="Brief description of the quiz"
                  maxLength={1000}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="input-field"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-6">
            {questions.map((q, qIndex) => (
              <div key={qIndex} className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Question {qIndex + 1}
                  </h3>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(qIndex)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Question Text *
                    </label>
                    <textarea
                      value={q.text || ''}
                      onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
                      className="input-field"
                      rows={2}
                      placeholder="Enter your question"
                      maxLength={2000}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Answer Options *
                    </label>
                    <div className="space-y-2">
                      {q.options?.map((opt, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${qIndex}`}
                            checked={q.correctOptionId === opt.optionId}
                            onChange={() => updateQuestion(qIndex, { correctOptionId: opt.optionId })}
                            className="w-4 h-4 text-primary-600"
                          />
                          <span className="font-medium text-gray-700 w-6">
                            {opt.optionId.toUpperCase()}.
                          </span>
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                            className="input-field flex-1"
                            placeholder={`Option ${opt.optionId.toUpperCase()}`}
                            maxLength={500}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Select the radio button next to the correct answer
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time Limit (seconds)
                    </label>
                    <input
                      type="number"
                      value={q.timeLimitSeconds || 20}
                      onChange={(e) => updateQuestion(qIndex, { timeLimitSeconds: parseInt(e.target.value) })}
                      className="input-field w-32"
                      min={5}
                      max={120}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Question Button */}
          <button
            type="button"
            onClick={addQuestion}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-500 transition-colors mt-6"
          >
            + Add Another Question
          </button>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mt-6">
              {error}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-4 mt-8">
            <Link to="/" className="btn-secondary flex-1 text-center">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Creating...' : 'Create Quiz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
