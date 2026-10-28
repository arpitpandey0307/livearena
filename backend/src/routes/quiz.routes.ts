import { Router, Request, Response, NextFunction } from 'express';
import { QuizService } from '../services/quiz.service';
import { AIService } from '../services/ai.service';
import {
  CreateQuizSchema,
  UpdateQuizSchema,
  AIGenerateQuizSchema,
  CreateQuizInput,
} from '../utils/validation';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
} from '../utils/response';
import { z } from 'zod';

const router = Router();

/**
 * @route   POST /api/quizzes
 * @desc    Create a new quiz
 * @access  Public
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = CreateQuizSchema.parse(req.body);

    // Validate questions
    const validation = QuizService.validateQuestions(validatedData.questions);
    if (!validation.valid) {
      return validationErrorResponse(res, validation.errors.join('; '));
    }

    const quiz = await QuizService.createQuiz(validatedData);
    return successResponse(res, quiz, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(
        res,
        error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      );
    }
    next(error);
  }
});

/**
 * @route   GET /api/quizzes
 * @desc    Get all quizzes (paginated)
 * @access  Public
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await QuizService.getAllQuizzes(page, limit);
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/quizzes/:quizId
 * @desc    Get a quiz by ID
 * @access  Public
 */
router.get('/:quizId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { quizId } = req.params;
    const quiz = await QuizService.getQuizById(quizId);

    if (!quiz) {
      return notFoundResponse(res, 'Quiz not found');
    }

    return successResponse(res, quiz);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/quizzes/:quizId
 * @desc    Update a quiz
 * @access  Public
 */
router.put('/:quizId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { quizId } = req.params;
    const validatedData = UpdateQuizSchema.parse(req.body);

    if (validatedData.questions) {
      const validation = QuizService.validateQuestions(validatedData.questions);
      if (!validation.valid) {
        return validationErrorResponse(res, validation.errors.join('; '));
      }
    }

    const quiz = await QuizService.updateQuiz(quizId, validatedData);

    if (!quiz) {
      return notFoundResponse(res, 'Quiz not found');
    }

    return successResponse(res, quiz);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(
        res,
        error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      );
    }
    next(error);
  }
});

/**
 * @route   DELETE /api/quizzes/:quizId
 * @desc    Delete a quiz
 * @access  Public
 */
router.delete('/:quizId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { quizId } = req.params;
    const deleted = await QuizService.deleteQuiz(quizId);

    if (!deleted) {
      return notFoundResponse(res, 'Quiz not found');
    }

    return successResponse(res, { message: 'Quiz deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/ai/generate-quiz
 * @desc    Generate quiz questions using AI
 * @access  Public
 */
router.post('/ai/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = AIGenerateQuizSchema.parse(req.body);

    const questions = await AIService.generateWithRetry(validatedData);

    // Return questions with a temporary quiz structure for preview
    const result = {
      title: validatedData.topic,
      description: validatedData.description,
      source: 'ai' as const,
      difficulty: validatedData.difficulty,
      questions,
      defaultTimeLimitSeconds: 20,
    };

    return successResponse(res, result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(
        res,
        error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      );
    }

    if (error instanceof Error) {
      return errorResponse(res, error.message, 'AI_ERROR', 500);
    }

    next(error);
  }
});

export default router;
