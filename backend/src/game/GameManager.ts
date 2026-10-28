import { Server, Socket } from 'socket.io';
import { GameSession, IGameSession } from '../models/GameSession';
import { Quiz, IQuiz } from '../models/Quiz';
import { RoomService } from '../services/room.service';
import { SubmitAnswerSchema } from '../utils/validation';
import { nanoid } from 'nanoid';

// In-memory game state
interface ActiveGameState {
  roomCode: string;
  quiz: IQuiz;
  session: IGameSession;
  currentQuestionIndex: number;
  questionStartTime: number | null;
  questionEndTime: number | null;
  acceptedAnswers: Map<string, { optionId: string; timestamp: number }>;
  hostSocketId: string;
  participantSockets: Map<string, string>; // participantId -> socketId
}

export class GameManager {
  private io: Server;
  private activeGames: Map<string, ActiveGameState> = new Map(); // roomCode -> state

  constructor(io: Server) {
    this.io = io;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Join room
      socket.on('room:join', async (data: { roomCode: string; participantId: string }) => {
        await this.handleRoomJoin(socket, data);
      });

      // Leave room
      socket.on('room:leave', async (data: { roomCode: string; participantId: string }) => {
        await this.handleRoomLeave(socket, data);
      });

      // Host joins
      socket.on('room:host-join', async (data: { roomCode: string; hostToken: string }) => {
        await this.handleHostJoin(socket, data);
      });

      // Start game
      socket.on('game:start', async (data: { roomCode: string; hostToken: string }) => {
        await this.handleGameStart(socket, data);
      });

      // Submit answer
      socket.on('answer:submit', async (data: {
        roomCode: string;
        participantId: string;
        questionId: string;
        selectedOptionId: string;
      }) => {
        await this.handleAnswerSubmit(socket, data);
      });

      // Next question
      socket.on('game:next-question', async (data: { roomCode: string; hostToken: string }) => {
        await this.handleNextQuestion(socket, data);
      });

      // Resume session
      socket.on('session:resume', async (data: { roomCode: string; participantId: string }) => {
        await this.handleSessionResume(socket, data);
      });

      // Disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  /**
   * Handle participant joining room
   */
  private async handleRoomJoin(
    socket: Socket,
    data: { roomCode: string; participantId: string }
  ) {
    try {
      const { roomCode, participantId } = data;
      const room = await RoomService.getRoomByCode(roomCode);

      if (!room) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
        return;
      }

      const participant = room.participants.find((p) => p.participantId === participantId);
      if (!participant) {
        socket.emit('error', { code: 'NOT_PARTICIPANT', message: 'Not a participant in this room' });
        return;
      }

      // Join socket room
      socket.join(`room:${roomCode}`);
      socket.data = { roomCode, participantId, isHost: false };

      // Update active game state
      let gameState = this.activeGames.get(roomCode);
      if (gameState) {
        gameState.participantSockets.set(participantId, socket.id);
      }

      // Get quiz
      const quiz = await Quiz.findById(room.quizId);
      if (!quiz) {
        socket.emit('error', { code: 'QUIZ_NOT_FOUND', message: 'Quiz not found' });
        return;
      }

      // Send room state
      socket.emit('room:joined', {
        roomCode,
        nickname: participant.nickname,
        quizTitle: quiz.title,
      });

      // Broadcast player joined
      this.io.to(`room:${roomCode}`).emit('room:player-joined', {
        participantId,
        nickname: participant.nickname,
        participantCount: room.participants.length,
      });

      // Send current lobby state
      const lobbyState = {
        participants: room.participants.map((p) => ({
          participantId: p.participantId,
          nickname: p.nickname,
        })),
        status: room.status,
      };
      this.io.to(`room:${roomCode}`).emit('room:state', lobbyState);

      console.log(`Participant ${participant.nickname} joined room ${roomCode}`);
    } catch (error) {
      console.error('Error in room:join:', error);
      socket.emit('error', { code: 'JOIN_ERROR', message: 'Failed to join room' });
    }
  }

  /**
   * Handle host joining room
   */
  private async handleHostJoin(
    socket: Socket,
    data: { roomCode: string; hostToken: string }
  ) {
    try {
      const { roomCode, hostToken } = data;
      const isValidHost = await RoomService.verifyHost(roomCode, hostToken);

      if (!isValidHost) {
        socket.emit('error', { code: 'UNAUTHORIZED', message: 'Invalid host credentials' });
        return;
      }

      const room = await RoomService.getRoomByCode(roomCode);
      if (!room) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
        return;
      }

      // Join socket room
      socket.join(`room:${roomCode}`);
      socket.data = { roomCode, hostToken, isHost: true };

      // Get quiz
      const quiz = await Quiz.findById(room.quizId);
      if (!quiz) {
        socket.emit('error', { code: 'QUIZ_NOT_FOUND', message: 'Quiz not found' });
        return;
      }

      // Initialize or update game state
      let gameState = this.activeGames.get(roomCode);
      if (!gameState) {
        gameState = {
          roomCode,
          quiz,
          session: room,
          currentQuestionIndex: -1,
          questionStartTime: null,
          questionEndTime: null,
          acceptedAnswers: new Map(),
          hostSocketId: socket.id,
          participantSockets: new Map(),
        };
        this.activeGames.set(roomCode, gameState);
      } else {
        gameState.hostSocketId = socket.id;
      }

      socket.emit('room:joined', {
        roomCode,
        isHost: true,
        quizTitle: quiz.title,
        questionCount: quiz.questions.length,
      });

      // Send lobby state
      const lobbyState = {
        participants: room.participants.map((p) => ({
          participantId: p.participantId,
          nickname: p.nickname,
        })),
        status: room.status,
      };
      this.io.to(`room:${roomCode}`).emit('room:state', lobbyState);

      console.log(`Host joined room ${roomCode}`);
    } catch (error) {
      console.error('Error in room:host-join:', error);
      socket.emit('error', { code: 'HOST_JOIN_ERROR', message: 'Failed to join as host' });
    }
  }

  /**
   * Handle game start
   */
  private async handleGameStart(
    socket: Socket,
    data: { roomCode: string; hostToken: string }
  ) {
    try {
      const { roomCode, hostToken } = data;
      const gameState = this.activeGames.get(roomCode);

      if (!gameState) {
        socket.emit('error', { code: 'NO_GAME', message: 'No active game found' });
        return;
      }

      if (gameState.session.hostSessionId !== hostToken) {
        socket.emit('error', { code: 'UNAUTHORIZED', message: 'Only the host can start the game' });
        return;
      }

      if (gameState.session.status !== 'waiting') {
        socket.emit('error', { code: 'INVALID_STATE', message: 'Game already started' });
        return;
      }

      // Update session status
      await GameSession.updateOne(
        { roomCode },
        { $set: { status: 'active', startedAt: new Date() } }
      );

      gameState.session.status = 'active';
      gameState.currentQuestionIndex = 0;

      // Broadcast game started
      this.io.to(`room:${roomCode}`).emit('game:started', {
        totalQuestions: gameState.quiz.questions.length,
      });

      // Send first question
      await this.sendQuestion(roomCode);

      console.log(`Game started in room ${roomCode}`);
    } catch (error) {
      console.error('Error in game:start:', error);
      socket.emit('error', { code: 'START_ERROR', message: 'Failed to start game' });
    }
  }

  /**
   * Send current question
   */
  private async sendQuestion(roomCode: string) {
    const gameState = this.activeGames.get(roomCode);
    if (!gameState) return;

    const questionIndex = gameState.currentQuestionIndex;
    if (questionIndex < 0 || questionIndex >= gameState.quiz.questions.length) {
      // Game completed
      await this.endGame(roomCode);
      return;
    }

    const question = gameState.quiz.questions[questionIndex];
    const now = Date.now();
    const duration = question.timeLimitSeconds * 1000;

    gameState.questionStartTime = now;
    gameState.questionEndTime = now + duration;
    gameState.acceptedAnswers.clear();

    // Update session
    await GameSession.updateOne(
      { roomCode },
      { $set: { currentQuestionIndex: questionIndex } }
    );

    // Broadcast question (without correct answer)
    const questionData = {
      questionIndex: questionIndex + 1,
      totalQuestions: gameState.quiz.questions.length,
      questionId: question.questionId,
      text: question.text,
      options: question.options.map((o) => ({ optionId: o.optionId, text: o.text })),
      timeLimitSeconds: question.timeLimitSeconds,
      deadline: gameState.questionEndTime,
    };

    this.io.to(`room:${roomCode}`).emit('question:started', questionData);

    // Set timeout to auto-end question
    setTimeout(() => {
      this.endQuestion(roomCode);
    }, duration);

    console.log(`Question ${questionIndex + 1} sent in room ${roomCode}`);
  }

  /**
   * Handle answer submission
   */
  private async handleAnswerSubmit(
    socket: Socket,
    data: {
      roomCode: string;
      participantId: string;
      questionId: string;
      selectedOptionId: string;
    }
  ) {
    try {
      const { roomCode, participantId, questionId, selectedOptionId } = data;
      const gameState = this.activeGames.get(roomCode);

      if (!gameState) {
        socket.emit('answer:rejected', { reason: 'No active game' });
        return;
      }

      // Validate submission window
      const now = Date.now();
      if (!gameState.questionStartTime || !gameState.questionEndTime) {
        socket.emit('answer:rejected', { reason: 'No active question' });
        return;
      }

      if (now > gameState.questionEndTime) {
        socket.emit('answer:rejected', { reason: 'Question time expired' });
        return;
      }

      // Check for duplicate submission
      if (gameState.acceptedAnswers.has(participantId)) {
        socket.emit('answer:rejected', { reason: 'Already submitted an answer' });
        return;
      }

      // Validate question
      const currentQuestion = gameState.quiz.questions[gameState.currentQuestionIndex];
      if (!currentQuestion || currentQuestion.questionId !== questionId) {
        socket.emit('answer:rejected', { reason: 'Invalid question' });
        return;
      }

      // Validate option
      const validOption = currentQuestion.options.find((o) => o.optionId === selectedOptionId);
      if (!validOption) {
        socket.emit('answer:rejected', { reason: 'Invalid option' });
        return;
      }

      // Accept answer
      gameState.acceptedAnswers.set(participantId, {
        optionId: selectedOptionId,
        timestamp: now,
      });

      socket.emit('answer:accepted', { questionId, selectedOptionId });

      console.log(`Answer accepted from ${participantId} for question ${questionId}`);
    } catch (error) {
      console.error('Error in answer:submit:', error);
      socket.emit('answer:rejected', { reason: 'Server error' });
    }
  }

  /**
   * End current question
   */
  private async endQuestion(roomCode: string) {
    const gameState = this.activeGames.get(roomCode);
    if (!gameState) return;

    const question = gameState.quiz.questions[gameState.currentQuestionIndex];
    if (!question) return;

    // Calculate scores for all accepted answers
    const participantUpdates: any[] = [];
    const leaderboardData: any[] = [];

    for (const [participantId, answer] of gameState.acceptedAnswers) {
      const isCorrect = answer.optionId === question.correctOptionId;
      const pointsAwarded = isCorrect ? 100 : 0;
      const responseTimeMs = answer.timestamp - (gameState.questionStartTime || 0);

      participantUpdates.push({
        updateOne: {
          filter: { roomCode, 'participants.participantId': participantId },
          update: {
            $push: {
              'participants.$.answers': {
                questionId: question.questionId,
                selectedOptionId: answer.optionId,
                isCorrect,
                responseTimeMs,
                pointsAwarded,
              },
            },
            $inc: {
              'participants.$.score': pointsAwarded,
              'participants.$.totalAnswered': 1,
              'participants.$.correctAnswers': isCorrect ? 1 : 0,
            },
          },
        },
      });
    }

    // Apply updates to database
    if (participantUpdates.length > 0) {
      await GameSession.bulkWrite(participantUpdates);
    }

    // Get updated session for leaderboard
    const session = await GameSession.findOne({ roomCode });
    if (session) {
      gameState.session = session;

      // Sort participants for leaderboard
      leaderboardData.push(
        ...session.participants.map((p) => ({
          participantId: p.participantId,
          nickname: p.nickname,
          score: p.score,
          correctAnswers: p.correctAnswers,
        }))
      );

      leaderboardData.sort((a, b) => b.score - a.score);
    }

    // Broadcast question ended with correct answer
    this.io.to(`room:${roomCode}`).emit('question:ended', {
      questionId: question.questionId,
      correctOptionId: question.correctOptionId,
      explanation: question.explanation,
    });

    // Broadcast leaderboard
    this.io.to(`room:${roomCode}`).emit('leaderboard:updated', leaderboardData);

    console.log(`Question ${gameState.currentQuestionIndex + 1} ended in room ${roomCode}`);
  }

  /**
   * Handle next question request
   */
  private async handleNextQuestion(
    socket: Socket,
    data: { roomCode: string; hostToken: string }
  ) {
    try {
      const { roomCode, hostToken } = data;
      const gameState = this.activeGames.get(roomCode);

      if (!gameState) {
        socket.emit('error', { code: 'NO_GAME', message: 'No active game found' });
        return;
      }

      if (gameState.session.hostSessionId !== hostToken) {
        socket.emit('error', { code: 'UNAUTHORIZED', message: 'Only the host can advance' });
        return;
      }

      // Move to next question
      gameState.currentQuestionIndex++;
      await this.sendQuestion(roomCode);
    } catch (error) {
      console.error('Error in game:next-question:', error);
      socket.emit('error', { code: 'NEXT_ERROR', message: 'Failed to advance question' });
    }
  }

  /**
   * End the game
   */
  private async endGame(roomCode: string) {
    const gameState = this.activeGames.get(roomCode);
    if (!gameState) return;

    // Calculate final rankings
    const session = await GameSession.findOne({ roomCode });
    if (!session) return;

    const rankedParticipants = [...session.participants]
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.correctAnswers !== a.correctAnswers) return b.correctAnswers - a.correctAnswers;
        return a.nickname.localeCompare(b.nickname);
      })
      .map((p, index) => ({ ...p.toObject(), rank: index + 1 }));

    // Update session with ranks and completed status
    await GameSession.updateOne(
      { roomCode },
      {
        $set: {
          status: 'completed',
          completedAt: new Date(),
          participants: rankedParticipants,
        },
      }
    );

    // Broadcast game completed
    this.io.to(`room:${roomCode}`).emit('game:completed', {
      sessionId: session._id,
      leaderboard: rankedParticipants.map((p) => ({
        rank: p.rank,
        participantId: p.participantId,
        nickname: p.nickname,
        score: p.score,
        correctAnswers: p.correctAnswers,
      })),
    });

    // Clean up
    this.activeGames.delete(roomCode);

    console.log(`Game completed in room ${roomCode}`);
  }

  /**
   * Handle participant leaving
   */
  private async handleRoomLeave(
    socket: Socket,
    data: { roomCode: string; participantId: string }
  ) {
    const { roomCode, participantId } = data;

    socket.leave(`room:${roomCode}`);

    const gameState = this.activeGames.get(roomCode);
    if (gameState) {
      gameState.participantSockets.delete(participantId);
    }

    await RoomService.removeParticipant(roomCode, participantId);

    this.io.to(`room:${roomCode}`).emit('room:player-left', { participantId });

    console.log(`Participant ${participantId} left room ${roomCode}`);
  }

  /**
   * Handle session resume
   */
  private async handleSessionResume(
    socket: Socket,
    data: { roomCode: string; participantId: string }
  ) {
    // This is similar to room:join but handles reconnection
    await this.handleRoomJoin(socket, data);
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(socket: Socket) {
    const { roomCode, participantId, isHost } = socket.data || {};

    if (roomCode) {
      if (isHost) {
        console.log(`Host disconnected from room ${roomCode}`);
        // Could implement host reconnect grace period here
      } else if (participantId) {
        console.log(`Participant ${participantId} disconnected from room ${roomCode}`);
        // Could implement participant reconnect grace period here
      }
    }
  }
}
