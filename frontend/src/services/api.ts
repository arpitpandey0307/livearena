import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response type wrapper
export interface ApiResponse<T> {
  data: T | null;
  error: {
    code: string;
    message: string;
  } | null;
}

// Quiz types
export interface Question {
  questionId: string;
  text: string;
  options: {
    optionId: string;
    text: string;
  }[];
  correctOptionId: string;
  explanation?: string;
  timeLimitSeconds: number;
}

export interface Quiz {
  _id: string;
  title: string;
  description?: string;
  source: 'manual' | 'ai';
  difficulty: 'easy' | 'medium' | 'hard';
  questions: Question[];
  defaultTimeLimitSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuizInput {
  title: string;
  description?: string;
  source: 'manual' | 'ai';
  difficulty: 'easy' | 'medium' | 'hard';
  questions: Omit<Question, 'questionId'>[];
  defaultTimeLimitSeconds?: number;
}

export interface AIGenerateInput {
  topic: string;
  description?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: number;
}

// Room types
export interface RoomInfo {
  roomCode: string;
  invitationUrl: string;
  quizTitle: string;
  participantCount: number;
  status: 'waiting' | 'active' | 'completed';
}

export interface CreateRoomResponse {
  roomCode: string;
  invitationUrl: string;
  quizTitle: string;
  hostToken: string;
}

export interface JoinRoomResponse {
  participantId: string;
  roomCode: string;
  status: 'waiting' | 'active' | 'completed';
}

// Session types
export interface ParticipantResult {
  participantId: string;
  nickname: string;
  score: number;
  correctAnswers: number;
  totalAnswered: number;
  rank: number;
}

export interface SessionResult {
  sessionId: string;
  roomCode: string;
  quizTitle: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  participants: ParticipantResult[];
}

// API functions
export const quizApi = {
  create: async (quiz: CreateQuizInput): Promise<Quiz> => {
    const response = await api.post<ApiResponse<Quiz>>('/quizzes', quiz);
    if (response.data.error) throw new Error(response.data.error.message);
    return response.data.data!;
  },

  getById: async (quizId: string): Promise<Quiz> => {
    const response = await api.get<ApiResponse<Quiz>>(`/quizzes/${quizId}`);
    if (response.data.error) throw new Error(response.data.error.message);
    return response.data.data!;
  },

  update: async (quizId: string, quiz: Partial<CreateQuizInput>): Promise<Quiz> => {
    const response = await api.put<ApiResponse<Quiz>>(`/quizzes/${quizId}`, quiz);
    if (response.data.error) throw new Error(response.data.error.message);
    return response.data.data!;
  },

  generate: async (input: AIGenerateInput): Promise<Quiz> => {
    const response = await api.post<ApiResponse<Quiz>>('/quizzes/ai/generate', input);
    if (response.data.error) throw new Error(response.data.error.message);
    return response.data.data!;
  },
};

export const roomApi = {
  create: async (quizId: string): Promise<CreateRoomResponse> => {
    const response = await api.post<ApiResponse<CreateRoomResponse>>('/rooms', { quizId });
    if (response.data.error) throw new Error(response.data.error.message);
    return response.data.data!;
  },

  getInfo: async (roomCode: string): Promise<RoomInfo> => {
    const response = await api.get<ApiResponse<RoomInfo>>(`/rooms/${roomCode}`);
    if (response.data.error) throw new Error(response.data.error.message);
    return response.data.data!;
  },

  join: async (roomCode: string, nickname: string): Promise<JoinRoomResponse> => {
    const response = await api.post<ApiResponse<JoinRoomResponse>>(`/rooms/${roomCode}/join`, { nickname });
    if (response.data.error) throw new Error(response.data.error.message);
    return response.data.data!;
  },
};

export const sessionApi = {
  getResults: async (sessionId: string): Promise<SessionResult> => {
    const response = await api.get<ApiResponse<SessionResult>>(`/rooms/sessions/${sessionId}/results`);
    if (response.data.error) throw new Error(response.data.error.message);
    return response.data.data!;
  },
};

export default api;
