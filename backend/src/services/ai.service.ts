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

/**
 * AI service supporting both Google Gemini (native API) and
 * OpenAI-compatible chat-completions endpoints.
 *
 * Selection is driven by env:
 *  - GEMINI_API_KEY (or AI_PROVIDER=gemini) -> Gemini generateContent
 *  - AI_API_KEY + AI_API_URL                 -> OpenAI-compatible chat completions
 */
export class AIService {
  private static get apiKey(): string {
    return (
      process.env.GEMINI_API_KEY ||
      process.env.AI_API_KEY ||
      ''
    );
  }

  private static get provider(): 'gemini' | 'openai' {
    if (process.env.AI_PROVIDER === 'openai') return 'openai';
    if (process.env.AI_PROVIDER === 'gemini') return 'gemini';
    if (process.env.GEMINI_API_KEY) return 'gemini';
    return 'openai';
  }

  private static get geminiModel(): string {
    return process.env.AI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  }

  private static get geminiUrl(): string {
    const base =
      process.env.AI_API_URL ||
      'https://generativelanguage.googleapis.com/v1beta';
    // If a full model endpoint was supplied, respect it.
    if (base.includes(':generateContent')) return base;
    return `${base.replace(/\/$/, '')}/models/${this.geminiModel}:generateContent`;
  }

  private static get openaiUrl(): string {
    return (
      process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions'
    );
  }

  private static get openaiModel(): string {
    return process.env.AI_MODEL || 'gpt-4';
  }

  /**
   * Generate quiz questions using AI
   */
  static async generateQuiz(input: AIGenerateQuizInput): Promise<QuestionInput[]> {
    if (!this.apiKey) {
      throw new Error(
        'AI API key not configured. Set GEMINI_API_KEY (or AI_API_KEY) in backend/.env'
      );
    }

    const prompt = this.buildPrompt(input);

    try {
      const response =
        this.provider === 'gemini'
          ? await this.callGemini(prompt)
          : await this.callOpenAI(prompt);

      const parsed = this.parseAIResponse(response);
      return this.transformQuestions(parsed.questions);
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
- Make sure the JSON is valid and parseable
- Respond with JSON only, no markdown fences, no extra commentary`;
  }

  /**
   * Call Google Gemini generateContent API
   */
  private static async callGemini(prompt: string): Promise<string> {
    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    };

    const response = await fetch(this.geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(this.describeProviderError(response.status, errorText));
    }

    const data: any = await response.json();

    const blocked = data?.promptFeedback?.blockReason;
    if (blocked) {
      throw new Error(`AI request blocked by provider: ${blocked}`);
    }

    const text = data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p.text)
      .filter(Boolean)
      .join('');

    if (!text) {
      throw new Error('AI provider returned an empty response');
    }

    return text;
  }

  /**
   * Call OpenAI-compatible chat completions API
   */
  private static async callOpenAI(prompt: string): Promise<string> {
    const response = await fetch(this.openaiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.openaiModel,
        messages: [
          {
            role: 'system',
            content:
              'You are a professional quiz creator. Generate high-quality multiple-choice questions in the exact JSON format requested. Always respond with valid JSON only, no additional text.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(this.describeProviderError(response.status, errorText));
    }

    const data: any = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * Turn provider errors into user-safe messages.
   * 401/403 -> key problem, 402/429 -> quota/billing
   */
  private static describeProviderError(status: number, raw: string): string {
    if (status === 401 || status === 403) {
      return 'AI authentication failed. Check that your GEMINI_API_KEY is valid and enabled for the Generative Language API.';
    }
    if (status === 402 || status === 429) {
      return 'AI quota exceeded or billing not enabled for this key. Try again later or use manual quiz creation.';
    }
    if (status === 404) {
      return 'AI model not found. Check AI_MODEL / GEMINI_MODEL in backend/.env.';
    }
    return `AI provider error (${status}): ${raw.slice(0, 300)}`;
  }

  /**
   * Parse and validate AI response
   */
  private static parseAIResponse(response: string): AIResponse {
    let jsonStr = response.trim();

    // Strip markdown code fences if the model added them
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    // Fallback: extract the outermost JSON object
    if (!jsonStr.startsWith('{')) {
      const start = jsonStr.indexOf('{');
      const end = jsonStr.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        jsonStr = jsonStr.slice(start, end + 1);
      }
    }

    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Invalid response format: missing questions array');
      }
      return parsed;
    } catch (error) {
      console.error('Failed to parse AI response:', response.slice(0, 500));
      throw new Error('Failed to parse AI response as JSON');
    }
  }

  /**
   * Transform AI questions to our schema
   */
  private static transformQuestions(questions: AIGeneratedQuestion[]): QuestionInput[] {
    return questions.map((q, index) => {
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        throw new Error(`Question ${index + 1} must have exactly 4 options`);
      }
      if (
        typeof q.correctAnswer !== 'number' ||
        q.correctAnswer < 0 ||
        q.correctAnswer >= q.options.length
      ) {
        throw new Error(`Invalid correctAnswer index for question ${index + 1}`);
      }

      return {
        questionId: `q${index + 1}`,
        text: q.question,
        options: q.options.map((opt, optIndex) => ({
          optionId: String.fromCharCode(97 + optIndex),
          text: opt,
        })),
        correctOptionId: String.fromCharCode(97 + q.correctAnswer),
        explanation: q.explanation,
        timeLimitSeconds: 20,
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

        const message = lastError.message;
        // Don't burn retries on auth/billing/model errors
        if (
          message.includes('authentication failed') ||
          message.includes('quota exceeded') ||
          message.includes('model not found') ||
          message.includes('key not configured')
        ) {
          throw lastError;
        }

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error('Failed to generate quiz after retries');
  }
}
