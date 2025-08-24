import { Message } from '../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export class ChatAPI {
  private static async fetchStream(
    url: string,
    options: RequestInit,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ) {
    try {
      console.log('Making request to:', url);
      const response = await fetch(url, options);
      
      if (!response.ok) {
        console.error('Response not ok:', response.status, response.statusText);
        throw new Error(`Network response was not ok: ${response.status}`);
      }

      console.log('Response received, starting stream processing');
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('Stream done');
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          console.log('Received chunk:', chunk);

          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.trim() && line.startsWith('data: ')) {
              const data = line.slice(6);
              console.log('Processing data:', data);
              
              if (data === '[DONE]') {
                console.log('Stream completed');
                onComplete();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                console.log('Parsed JSON:', parsed);
                if (parsed.content) {
                  console.log('Calling onChunk with:', parsed.content);
                  onChunk(parsed.content);
                }
              } catch (e) {
                console.error('Failed to parse JSON:', data, e);
              }
            }
          }
        }
        
        // Process any remaining buffer
        if (buffer.trim() && buffer.startsWith('data: ')) {
          const data = buffer.slice(6);
          if (data === '[DONE]') {
            console.log('Stream completed from buffer');
            onComplete();
          }
        }
      }
    } catch (error) {
      console.error('fetchStream error:', error);
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