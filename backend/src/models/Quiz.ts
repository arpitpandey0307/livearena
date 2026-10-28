import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestion {
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

export interface IQuiz extends Document {
  title: string;
  description?: string;
  source: 'manual' | 'ai';
  difficulty: 'easy' | 'medium' | 'hard';
  questions: IQuestion[];
  defaultTimeLimitSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    questionId: { type: String, required: true },
    text: { type: String, required: true },
    options: [
      {
        optionId: { type: String, required: true },
        text: { type: String, required: true },
      },
    ],
    correctOptionId: { type: String, required: true },
    explanation: { type: String },
    timeLimitSeconds: { type: Number, default: 20 },
  },
  { _id: false }
);

const QuizSchema = new Schema<IQuiz>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000 },
    source: { type: String, enum: ['manual', 'ai'], required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    questions: [QuestionSchema],
    defaultTimeLimitSeconds: { type: Number, default: 20 },
  },
  { timestamps: true }
);

// Index for faster queries
QuizSchema.index({ createdAt: -1 });

export const Quiz = mongoose.model<IQuiz>('Quiz', QuizSchema);
