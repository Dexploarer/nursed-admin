import { streamText, generateText as aiGenerateText, createGateway } from 'ai';
import { loadSettings } from './settings';

interface TextGenerationOptions {
  prompt: string;
  type?: string;
  onChunk?: (chunk: string) => void;
}

interface ImageGenerationOptions {
  prompt: string;
  context?: string;
  style?: string;
}

/**
 * Generate text using Vercel AI Gateway with streaming support
 * Uses the AI SDK's streamText with AI Gateway for all model inference
 */
export async function generateText(options: TextGenerationOptions): Promise<string> {
  const settings = await loadSettings();

  if (!settings.apiKey) {
    throw new Error('API key not configured. Please set up your AI settings first.');
  }

  // Configure AI Gateway with user's API key
  const aiGateway = createGateway({
    apiKey: settings.apiKey,
  });

  // Build the full prompt with system message
  const systemPrompt = 'You are an expert nursing educator. Generate clear, accurate, and clinically appropriate educational content.';
  const fullPrompt = options.prompt;

  try {
    // Use streamText with AI Gateway
    const result = await streamText({
      model: aiGateway(settings.textModel), // e.g., "openai/gpt-4o" via gateway
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: fullPrompt,
        },
      ],
      temperature: 0.7,
    });

    let fullText = '';

    // Stream the chunks if callback is provided
    if (options.onChunk) {
      for await (const chunk of result.textStream) {
        fullText += chunk;
        options.onChunk(chunk);
      }
    } else {
      // If no callback, just accumulate all text
      for await (const chunk of result.textStream) {
        fullText += chunk;
      }
    }

    return fullText;
  } catch (error) {
    console.error('AI generation error:', error);
    throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate an image using AI Gateway
 * Note: Image generation requires different API than text generation
 */
export async function generateImage(options: ImageGenerationOptions): Promise<{ url: string }> {
  const settings = await loadSettings();

  if (!settings.apiKey) {
    throw new Error('API key not configured. Please set up your AI settings first.');
  }

  // Build the full prompt with context and style
  let fullPrompt = options.prompt;
  if (options.context && options.context.trim()) {
    fullPrompt = `${options.prompt} (Context: ${options.context.substring(0, 500)})`;
  }
  if (options.style) {
    fullPrompt = `${fullPrompt} - Style: ${options.style}`;
  }

  // For image generation, we need to use OpenAI's DALL-E API directly
  // as the AI SDK doesn't currently support image generation through streamText/generateText
  // This is a temporary solution until AI SDK adds native image generation support

  const modelParts = settings.imageModel.split('/');
  const modelName = modelParts.length > 1 ? modelParts[1] : settings.imageModel;

  try {
    // Use AI Gateway base URL for image generation
    const baseUrl = 'https://gateway.ai.cloudflare.com/v1/images/generations';

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        prompt: fullPrompt,
        n: 1,
        size: '1024x1024',
      }),
    });

    if (!response.ok) {
      throw new Error(`Image generation failed: ${response.statusText}`);
    }

    const data = await response.json();
    return { url: data.data?.[0]?.url || '' };
  } catch (error) {
    console.error('Image generation error:', error);
    throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate text synchronously without streaming (for simpler use cases)
 */
export async function generateTextSync(prompt: string): Promise<string> {
  const settings = await loadSettings();

  if (!settings.apiKey) {
    throw new Error('API key not configured. Please set up your AI settings first.');
  }

  const aiGateway = createGateway({
    apiKey: settings.apiKey,
  });

  try {
    const { text } = await aiGenerateText({
      model: aiGateway(settings.textModel),
      prompt,
      temperature: 0.7,
    });

    return text;
  } catch (error) {
    console.error('AI generation error:', error);
    throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
