import { Quiz, IQuiz, IQuestion } from '../models/Quiz';
import { CreateQuizInput, UpdateQuizInput, QuestionInput } from '../utils/validation';

export class QuizService {
  /**
   * Create a new quiz
   */
  static async createQuiz(input: CreateQuizInput): Promise<IQuiz> {
    // Apply default time limit to questions that don't have one
    const questions = input.questions.map((q, index) => ({
      ...q,
      questionId: q.questionId || `q${index + 1}`,
      timeLimitSeconds: q.timeLimitSeconds || input.defaultTimeLimitSeconds,
    }));

    const quiz = new Quiz({
      ...input,
      questions,
    });

    return await quiz.save();
  }

  /**
   * Get a quiz by ID
   */
  static async getQuizById(quizId: string): Promise<IQuiz | null> {
    return await Quiz.findById(quizId);
  }

  /**
   * Update a quiz
   */
  static async updateQuiz(quizId: string, input: UpdateQuizInput): Promise<IQuiz | null> {
    const updateData: any = { ...input };

    if (input.questions) {
      updateData.questions = input.questions.map((q, index) => ({
        ...q,
        questionId: q.questionId || `q${index + 1}`,
        timeLimitSeconds: q.timeLimitSeconds || input.defaultTimeLimitSeconds || 20,
      }));
    }

    return await Quiz.findByIdAndUpdate(
      quizId,
      { $set: updateData },
      { new: true, runValidators: true }
    );
  }

  /**
   * Delete a quiz
   */
  static async deleteQuiz(quizId: string): Promise<boolean> {
    const result = await Quiz.findByIdAndDelete(quizId);
    return result !== null;
  }

  /**
   * Get all quizzes (paginated)
   */
  static async getAllQuizzes(page = 1, limit = 10): Promise<{
    quizzes: IQuiz[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const total = await Quiz.countDocuments();
    const quizzes = await Quiz.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return {
      quizzes,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Validate quiz questions
   */
  static validateQuestions(questions: QuestionInput[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    questions.forEach((q, index) => {
      // Check if correct option exists in options
      const correctOptionExists = q.options.some(
        (opt) => opt.optionId === q.correctOptionId
      );

      if (!correctOptionExists) {
        errors.push(
          `Question ${index + 1}: Correct option ID "${q.correctOptionId}" not found in options`
        );
      }

      // Check for duplicate option IDs
      const optionIds = q.options.map((opt) => opt.optionId);
      const uniqueIds = new Set(optionIds);
      if (optionIds.length !== uniqueIds.size) {
        errors.push(`Question ${index + 1}: Duplicate option IDs found`);
      }

      // Check for duplicate option texts
      const optionTexts = q.options.map((opt) => opt.text.toLowerCase());
      const uniqueTexts = new Set(optionTexts);
      if (optionTexts.length !== uniqueTexts.size) {
        errors.push(`Question ${index + 1}: Duplicate option texts found`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
