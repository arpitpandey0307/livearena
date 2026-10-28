import { nanoid } from 'nanoid';
import { GameSession, IGameSession } from '../models/GameSession';
import { Quiz } from '../models/Quiz';

export interface RoomInfo {
  roomCode: string;
  invitationUrl: string;
  quizTitle: string;
  participantCount: number;
  status: 'waiting' | 'active' | 'completed';
}

export class RoomService {
  /**
   * Generate a unique room code
   */
  private static generateRoomCode(): string {
    return nanoid(6).toUpperCase();
  }

  /**
   * Create a new room for a quiz
   */
  static async createRoom(quizId: string): Promise<{
    room: IGameSession;
    roomInfo: RoomInfo;
    hostToken: string;
  }> {
    // Verify quiz exists
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    // Generate unique room code (retry if collision)
    let roomCode = this.generateRoomCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const existing = await GameSession.findOne({ roomCode });
      if (!existing) break;
      roomCode = this.generateRoomCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique room code');
    }

    // Generate host token
    const hostToken = nanoid(32);

    // Create session
    const room = new GameSession({
      quizId,
      roomCode,
      status: 'waiting',
      hostSessionId: hostToken,
      participants: [],
    });

    await room.save();

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const roomInfo: RoomInfo = {
      roomCode,
      invitationUrl: `${baseUrl}/join/${roomCode}`,
      quizTitle: quiz.title,
      participantCount: 0,
      status: 'waiting',
    };

    return { room, roomInfo, hostToken };
  }

  /**
   * Get room by code
   */
  static async getRoomByCode(roomCode: string): Promise<IGameSession | null> {
    return await GameSession.findOne({ roomCode: roomCode.toUpperCase() })
      .populate('quizId');
  }

  /**
   * Get room info (public)
   */
  static async getRoomInfo(roomCode: string): Promise<RoomInfo | null> {
    const room = await this.getRoomByCode(roomCode);
    if (!room) return null;

    const quiz = await Quiz.findById(room.quizId);
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    return {
      roomCode: room.roomCode,
      invitationUrl: `${baseUrl}/join/${room.roomCode}`,
      quizTitle: quiz?.title || 'Unknown Quiz',
      participantCount: room.participants.length,
      status: room.status,
    };
  }

  /**
   * Validate if a room can accept new players
   */
  static canJoinRoom(room: IGameSession): {
    canJoin: boolean;
    reason?: string;
  } {
    if (!room) {
      return { canJoin: false, reason: 'Room not found' };
    }

    if (room.status === 'completed') {
      return { canJoin: false, reason: 'This quiz has already ended' };
    }

    if (room.status === 'active') {
      return { canJoin: false, reason: 'This quiz is already in progress' };
    }

    return { canJoin: true };
  }

  /**
   * Add participant to room
   */
  static async addParticipant(
    roomCode: string,
    nickname: string
  ): Promise<{
    participantId: string;
    room: IGameSession;
  }> {
    const room = await this.getRoomByCode(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    const validation = this.canJoinRoom(room);
    if (!validation.canJoin) {
      throw new Error(validation.reason);
    }

    // Check for duplicate nickname
    const duplicateNickname = room.participants.some(
      (p) => p.nickname.toLowerCase() === nickname.toLowerCase()
    );
    if (duplicateNickname) {
      throw new Error('This nickname is already taken');
    }

    // Generate participant ID
    const participantId = nanoid(16);

    // Add participant
    room.participants.push({
      participantId,
      nickname,
      score: 0,
      correctAnswers: 0,
      totalAnswered: 0,
      answers: [],
    });

    await room.save();

    return { participantId, room };
  }

  /**
   * Remove participant from room
   */
  static async removeParticipant(roomCode: string, participantId: string): Promise<void> {
    await GameSession.updateOne(
      { roomCode: roomCode.toUpperCase() },
      { $pull: { participants: { participantId } } }
    );
  }

  /**
   * Verify host token
   */
  static async verifyHost(roomCode: string, hostToken: string): Promise<boolean> {
    const room = await this.getRoomByCode(roomCode);
    return room?.hostSessionId === hostToken;
  }
}
