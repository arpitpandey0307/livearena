import mongoose, { Document, Schema } from 'mongoose';

export interface IAnswerRecord {
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  responseTimeMs: number;
  pointsAwarded: number;
}

export interface IParticipant {
  participantId: string;
  nickname: string;
  score: number;
  correctAnswers: number;
  totalAnswered: number;
  rank?: number;
  answers: IAnswerRecord[];
}

export interface IGameSession extends Document {
  quizId: mongoose.Types.ObjectId;
  roomCode: string;
  status: 'waiting' | 'active' | 'completed';
  hostSessionId: string;
  currentQuestionIndex: number;
  startedAt?: Date;
  completedAt?: Date;
  participants: IParticipant[];
  createdAt: Date;
  updatedAt: Date;
}

const AnswerRecordSchema = new Schema<IAnswerRecord>(
  {
    questionId: { type: String, required: true },
    selectedOptionId: { type: String, required: true },
    isCorrect: { type: Boolean, required: true },
    responseTimeMs: { type: Number, required: true },
    pointsAwarded: { type: Number, required: true },
  },
  { _id: false }
);

const ParticipantSchema = new Schema<IParticipant>(
  {
    participantId: { type: String, required: true },
    nickname: { type: String, required: true, trim: true, maxlength: 50 },
    score: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    totalAnswered: { type: Number, default: 0 },
    rank: { type: Number },
    answers: [AnswerRecordSchema],
  },
  { _id: false }
);

const GameSessionSchema = new Schema<IGameSession>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    roomCode: { type: String, required: true, uppercase: true, length: 6 },
    status: { type: String, enum: ['waiting', 'active', 'completed'], default: 'waiting' },
    hostSessionId: { type: String, required: true },
    currentQuestionIndex: { type: Number, default: -1 },
    startedAt: { type: Date },
    completedAt: { type: Date },
    participants: [ParticipantSchema],
  },
  { timestamps: true }
);

// Unique index on roomCode for active sessions
GameSessionSchema.index({ roomCode: 1 }, { unique: true });
GameSessionSchema.index({ quizId: 1 });
GameSessionSchema.index({ createdAt: -1 });

export const GameSession = mongoose.model<IGameSession>('GameSession', GameSessionSchema);
