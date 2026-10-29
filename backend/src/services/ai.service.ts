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
 * AI service supporting Google Gemini, OpenAI-compatible chat-completions,
 * and Anthropic Claude Messages API.
 *
 * Selection is driven by env:
 *  - GEMINI_API_KEY (or AI_PROVIDER=gemini) -> Gemini generateContent
 *  - AI_PROVIDER=anthropic or AI_PROVIDER=claude -> Anthropic Messages API
 *  - AI_API_KEY + AI_API_URL                     -> OpenAI-compatible chat completions
 */
export class AIService {
  private static get apiKey(): string {
    return (
      process.env.GEMINI_API_KEY ||
      process.env.AI_API_KEY ||
      ''
    );
  }

  private static get provider(): 'gemini' | 'openai' | 'anthropic' {
    const provider = process.env.AI_PROVIDER?.toLowerCase().trim();
    if (provider === 'gemini') return 'gemini';
    if (provider === 'anthropic' || provider === 'claude') return 'anthropic';
    if (provider === 'openai') return 'openai';
    if (process.env.GEMINI_API_KEY) return 'gemini';
    // Detect Anthropic key format (sk-ant-...)
    if (this.apiKey.startsWith('sk-ant-')) return 'anthropic';
    // Detect OpenAI key format (sk-...)
    if (this.apiKey.startsWith('sk-')) return 'openai';
    // Default to gemini (Gemini keys commonly start with AIza or AQ.)
    return 'gemini';
  }

  private static get geminiModel(): string {
    const model = process.env.GEMINI_MODEL || process.env.AI_MODEL;
    if (model && !model.toLowerCase().includes('claude') && !model.toLowerCase().includes('gpt')) {
      return model;
    }
    return 'gemini-2.5-flash';
  }

  private static get geminiUrl(): string {
    const base = process.env.AI_API_URL?.trim();
    if (base && base.includes(':generateContent')) return base;
    const cleanBase = (base && !base.includes('anthropic') && !base.includes('openai'))
      ? base.replace(/\/$/, '')
      : 'https://generativelanguage.googleapis.com/v1beta';
    return `${cleanBase}/models/${this.geminiModel}:generateContent`;
  }

  private static get openaiUrl(): string {
    return (
      process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions'
    );
  }

  private static get openaiModel(): string {
    return process.env.AI_MODEL || 'gpt-4';
  }

  private static get anthropicUrl(): string {
    return (
      process.env.AI_API_URL || 'https://api.anthropic.com/v1/messages'
    );
  }

  private static get anthropicModel(): string {
    return process.env.AI_MODEL || 'claude-sonnet-4-20250514';
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
      let response: string;

      if (this.provider === 'gemini') {
        response = await this.callGemini(prompt);
      } else if (this.provider === 'anthropic') {
        response = await this.callAnthropic(prompt);
      } else {
        response = await this.callOpenAI(prompt);
      }

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

    let targetUrl = this.geminiUrl;
    try {
      const urlObj = new URL(targetUrl);
      if (!urlObj.searchParams.has('key') && this.apiKey) {
        urlObj.searchParams.set('key', this.apiKey);
      }
      targetUrl = urlObj.toString();
    } catch {
      if (!targetUrl.includes('key=') && this.apiKey) {
        targetUrl += `${targetUrl.includes('?') ? '&' : '?'}key=${encodeURIComponent(this.apiKey)}`;
      }
    }

    let response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    // If gemini-2.0-flash returned 404, fallback to gemini-1.5-flash
    if (response.status === 404 && targetUrl.includes('gemini-2.0-flash')) {
      const fallbackUrl = targetUrl.replace('gemini-2.0-flash', 'gemini-1.5-flash');
      response = await fetch(fallbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
      });
    }

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
   * Call Anthropic Claude Messages API
   */
  private static async callAnthropic(prompt: string): Promise<string> {
    const response = await fetch(this.anthropicUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.anthropicModel,
        max_tokens: 4096,
        temperature: 0.7,
        system: 'You are a professional quiz creator. Generate high-quality multiple-choice questions in the exact JSON format requested. Always respond with valid JSON only, no additional text.',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(this.describeProviderError(response.status, errorText));
    }

    const data: any = await response.json();

    // Anthropic returns content as an array of blocks
    const textContent = data.content
      ?.filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('');

    if (!textContent) {
      throw new Error('AI provider returned an empty response');
    }

    return textContent;
  }

  /**
   * Turn provider errors into user-safe messages.
   * 401/403 -> key problem, 402/429 -> quota/billing
   */
  private static describeProviderError(status: number, raw: string): string {
    let cleanMessage = '';
    try {
      const parsed = JSON.parse(raw);
      cleanMessage = parsed.error?.message || parsed.message || '';
    } catch {
      cleanMessage = raw.slice(0, 200);
    }

    if (status === 401 || status === 403) {
      return `AI authentication failed (${status}). Check that your Gemini API key is valid: ${cleanMessage}`;
    }
    if (status === 402 || status === 429) {
      return `AI quota exceeded (${status}). Please try again later: ${cleanMessage}`;
    }
    if (status === 404) {
      return `AI model not found (${status}). Check AI_MODEL in backend/.env: ${cleanMessage}`;
    }
    return `AI provider error (${status}): ${cleanMessage || raw.slice(0, 300)}`;
  }

  /**
   * Parse and validate AI response
   */
  private static parseAIResponse(response: string): AIResponse {
    let jsonStr = response.trim();

    // Strip markdown code fences if the model added them
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

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

      let correctIndex = -1;
      if (typeof q.correctAnswer === 'number') {
        correctIndex = q.correctAnswer;
      } else if (typeof q.correctAnswer === 'string') {
        const parsed = parseInt(q.correctAnswer, 10);
        if (!isNaN(parsed)) {
          correctIndex = parsed;
        } else {
          const letter = (q.correctAnswer as string).trim().toUpperCase();
          if (letter.length === 1 && letter >= 'A' && letter <= 'D') {
            correctIndex = letter.charCodeAt(0) - 65;
          }
        }
      }

      if (correctIndex < 0 || correctIndex >= q.options.length) {
        throw new Error(`Invalid correctAnswer index for question ${index + 1}`);
      }

      return {
        questionId: `q${index + 1}`,
        text: q.question,
        options: q.options.map((opt, optIndex) => ({
          optionId: String.fromCharCode(97 + optIndex),
          text: opt,
        })),
        correctOptionId: String.fromCharCode(97 + correctIndex),
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
