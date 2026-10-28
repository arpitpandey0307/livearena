import { Router, Request, Response, NextFunction } from 'express';
import { RoomService } from '../services/room.service';
import { CreateRoomSchema, JoinRoomSchema } from '../utils/validation';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
} from '../utils/response';
import { z } from 'zod';

const router = Router();

/**
 * @route   POST /api/rooms
 * @desc    Create a new room for a quiz
 * @access  Public
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = CreateRoomSchema.parse(req.body);

    const { roomInfo, hostToken } = await RoomService.createRoom(validatedData.quizId);

    return successResponse(res, {
      ...roomInfo,
      hostToken, // Send host token for client to store
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(
        res,
        error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      );
    }

    if (error instanceof Error) {
      return errorResponse(res, error.message, 'ROOM_ERROR', 400);
    }

    next(error);
  }
});

/**
 * @route   GET /api/rooms/:roomCode
 * @desc    Get room info by code
 * @access  Public
 */
router.get('/:roomCode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roomCode } = req.params;
    const roomInfo = await RoomService.getRoomInfo(roomCode);

    if (!roomInfo) {
      return notFoundResponse(res, 'Room not found');
    }

    return successResponse(res, roomInfo);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/rooms/:roomCode/join
 * @desc    Join a room with nickname
 * @access  Public
 */
router.post('/:roomCode/join', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roomCode } = req.params;
    const validatedData = JoinRoomSchema.parse(req.body);

    const { participantId, room } = await RoomService.addParticipant(
      roomCode,
      validatedData.nickname
    );

    return successResponse(res, {
      participantId,
      roomCode: room.roomCode,
      status: room.status,
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(
        res,
        error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      );
    }

    if (error instanceof Error) {
      return errorResponse(res, error.message, 'JOIN_ERROR', 400);
    }

    next(error);
  }
});

/**
 * @route   GET /api/sessions/:sessionId/results
 * @desc    Get completed game results
 * @access  Public
 */
router.get('/sessions/:sessionId/results', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const { GameSession } = await import('../models/GameSession');
    const { Quiz } = await import('../models/Quiz');

    const session = await GameSession.findById(sessionId);
    if (!session) {
      return notFoundResponse(res, 'Session not found');
    }

    const quiz = await Quiz.findById(session.quizId);

    // Calculate rankings
    const rankedParticipants = [...session.participants]
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.correctAnswers !== a.correctAnswers) return b.correctAnswers - a.correctAnswers;
        return a.nickname.localeCompare(b.nickname);
      })
      .map((p, index) => ({ ...p.toObject(), rank: index + 1 }));

    const result = {
      sessionId: session._id,
      roomCode: session.roomCode,
      quizTitle: quiz?.title || 'Unknown Quiz',
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      participants: rankedParticipants,
    };

    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
});

export default router;
