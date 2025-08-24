import { Message } from '../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export class ChatAPIXHR {
  private static fetchStreamXHR(
    url: string,
    options: { method: string; headers: Record<string, string>; body: string },
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
    abortSignal?: AbortSignal
  ) {
    const xhr = new XMLHttpRequest();
    let lastIndex = 0;

    xhr.open(options.method, url);
    
    // Set headers
    Object.entries(options.headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.onreadystatechange = () => {
      if (xhr.readyState >= 3) { // LOADING state
        const responseText = xhr.responseText;
        const newData = responseText.slice(lastIndex);
        lastIndex = responseText.length;

        if (newData) {
          // Split by lines and process each line
          const lines = newData.split('\n');
          
          for (const line of lines) {
            if (line.trim() && line.startsWith('data: ')) {
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
                console.error('Failed to parse JSON:', data, e);
              }
            }
          }
        }
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        onComplete();
      } else {
        onError(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => {
      onError(new Error('Network error'));
    };

    // Handle abort signal
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        xhr.abort();
      });
    }

    xhr.send(options.body);
  }

  static async sendMessage(
    messages: Message[],
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
    abortSignal?: AbortSignal
  ) {
    const cleanMessages = messages.map(({ id, isStreaming, timestamp, ...msg }) => msg);
    
    this.fetchStreamXHR(
      `${API_BASE_URL}/api/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: cleanMessages }),
      },
      onChunk,
      onComplete,
      onError,
      abortSignal
    );
  }
}