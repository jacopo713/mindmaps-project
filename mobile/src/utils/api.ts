import { Message } from '../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export class ChatAPI {
  private static async fetchStream(
    url: string,
    options: RequestInit,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                onComplete();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  onChunk(parsed.content);
                }
              } catch (e) {
                console.error('Failed to parse JSON:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      onError(error as Error);
    }
  }

  static async sendMessage(
    messages: Message[],
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
    abortSignal?: AbortSignal
  ) {
    const cleanMessages = messages.map(({ id, isStreaming, timestamp, ...msg }) => msg);
    
    await this.fetchStream(
      `${API_BASE_URL}/api/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: cleanMessages }),
        signal: abortSignal,
      },
      onChunk,
      onComplete,
      onError
    );
  }
}