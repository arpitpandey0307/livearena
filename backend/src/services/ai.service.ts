import { AIGenerateQuizInput, QuestionInput } from '../utils/validation';

interface AIGeneratedQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct answer (0-3)
  explanation?: string;
}

interface AIResponse {
  questions: AIGeneratedQuestion[];
}

export class AIService {
  private static apiKey = process.env.AI_API_KEY || '';
  private static apiUrl = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
  private static model = process.env.AI_MODEL || 'gpt-4';

  /**
   * Generate quiz questions using AI
   */
  static async generateQuiz(input: AIGenerateQuizInput): Promise<QuestionInput[]> {
    if (!this.apiKey) {
      throw new Error('AI API key not configured');
    }

    const prompt = this.buildPrompt(input);

    try {
      const response = await this.callAI(prompt);
      const parsed = this.parseAIResponse(response);

      // Validate and transform to our schema
      return this.transformQuestions(parsed.questions, input.difficulty);
    } catch (error) {
      console.error('AI generation error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to generate quiz questions'
      );
    }
  }

  /**
   * Build the prompt for AI generation
   */
  private static buildPrompt(input: AIGenerateQuizInput): string {
    const difficultyInstructions = {
      easy: 'simple concepts and straightforward questions',
      medium: 'moderate complexity requiring some reasoning',
      hard: 'advanced concepts requiring deep understanding',
    };

    return `Generate ${input.questionCount} multiple-choice quiz questions about "${input.topic}".
${input.description ? `Context: ${input.description}` : ''}

Difficulty level: ${difficultyInstructions[input.difficulty]}

Requirements:
- Each question must have exactly 4 options
- Only one correct answer per question
- Questions should be clear and unambiguous
- Avoid trick questions or misleading options
- Include a brief explanation for the correct answer

Return your response as a valid JSON object with this exact structure:
{
  "questions": [
    {
      "question": "The question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}

Important:
- correctAnswer is the index (0-3) of the correct option
- All questions must be about ${input.topic}
- Make sure the JSON is valid and parseable`;
  }

  /**
   * Call the AI API
   */
  private static async callAI(prompt: string): Promise<string> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional quiz creator. Generate high-quality multiple-choice questions in the exact JSON format requested. Always respond with valid JSON only, no additional text.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * Parse and validate AI response
   */
  private static parseAIResponse(response: string): AIResponse {
    // Try to extract JSON from the response
    let jsonStr = response.trim();

    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }

    jsonStr = jsonStr.trim();

    try {
      const parsed = JSON.parse(jsonStr);

      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Invalid response format: missing questions array');
      }

      return parsed;
    } catch (error) {
      console.error('Failed to parse AI response:', response);
      throw new Error('Failed to parse AI response as JSON');
    }
  }

  /**
   * Transform AI questions to our schema
   */
  private static transformQuestions(
    questions: AIGeneratedQuestion[],
    difficulty: string
  ): QuestionInput[] {
    return questions.map((q, index) => {
      // Validate correctAnswer index
      if (q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
        throw new Error(`Invalid correctAnswer index for question ${index + 1}`);
      }

      // Check for exactly 4 options
      if (q.options.length !== 4) {
        throw new Error(`Question ${index + 1} must have exactly 4 options`);
      }

      return {
        questionId: `q${index + 1}`,
        text: q.question,
        options: q.options.map((opt, optIndex) => ({
          optionId: String.fromCharCode(97 + optIndex), // a, b, c, d
          text: opt,
        })),
        correctOptionId: String.fromCharCode(97 + q.correctAnswer), // a, b, c, d
        explanation: q.explanation,
        timeLimitSeconds: difficulty === 'hard' ? 30 : difficulty === 'easy' ? 15 : 20,
      };
    });
  }

  /**
   * Retry generation with exponential backoff
   */
  static async generateWithRetry(
    input: AIGenerateQuizInput,
    maxRetries = 2
  ): Promise<QuestionInput[]> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.generateQuiz(input);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt < maxRetries) {
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error('Failed to generate quiz after retries');
  }
}
