import { z } from 'zod';

// Question schemas
export const OptionSchema = z.object({
  optionId: z.string().min(1).max(10),
  text: z.string().min(1).max(500),
});

export const QuestionSchema = z.object({
  questionId: z.string().min(1).max(50),
  text: z.string().min(1).max(2000),
  options: z.array(OptionSchema).min(2).max(6),
  correctOptionId: z.string().min(1).max(10),
  explanation: z.string().max(1000).optional(),
  timeLimitSeconds: z.number().int().min(5).max(120).default(20),
});

// Quiz schemas
export const CreateQuizSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).trim().optional(),
  source: z.enum(['manual', 'ai']),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  questions: z.array(QuestionSchema).min(1).max(50),
  defaultTimeLimitSeconds: z.number().int().min(5).max(120).default(20),
});

export const UpdateQuizSchema = CreateQuizSchema.partial();

// AI Generation schemas
export const AIGenerateQuizSchema = z.object({
  topic: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).trim().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  questionCount: z.number().int().min(1).max(30).default(10),
});

// Room schemas
export const CreateRoomSchema = z.object({
  quizId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid quiz ID'),
});

export const JoinRoomSchema = z.object({
  nickname: z.string().min(1).max(50).trim(),
});

// Answer submission schema
export const SubmitAnswerSchema = z.object({
  questionId: z.string().min(1),
  selectedOptionId: z.string().min(1),
});

// Types
export type CreateQuizInput = z.infer<typeof CreateQuizSchema>;
export type UpdateQuizInput = z.infer<typeof UpdateQuizSchema>;
export type AIGenerateQuizInput = z.infer<typeof AIGenerateQuizSchema>;
export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;
export type JoinRoomInput = z.infer<typeof JoinRoomSchema>;
export type SubmitAnswerInput = z.infer<typeof SubmitAnswerSchema>;
export type QuestionInput = z.infer<typeof QuestionSchema>;
