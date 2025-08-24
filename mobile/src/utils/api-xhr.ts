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
          console.log('XHR received new data:', newData);
          
          // Split by lines and process each line
          const lines = newData.split('\n');
          
          for (const line of lines) {
            if (line.trim() && line.startsWith('data: ')) {
              const data = line.slice(6);
              console.log('XHR processing data:', data);
              
              if (data === '[DONE]') {
                console.log('XHR stream completed');
                onComplete();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                console.log('XHR parsed JSON:', parsed);
                if (parsed.content) {
                  console.log('XHR calling onChunk with:', parsed.content);
                  onChunk(parsed.content);
                }
              } catch (e) {
                console.error('XHR failed to parse JSON:', data, e);
              }
            }
          }
        }
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        console.log('XHR completed successfully');
        onComplete();
      } else {
        console.error('XHR error:', xhr.status, xhr.statusText);
        onError(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => {
      console.error('XHR network error');
      onError(new Error('Network error'));
    };

    // Handle abort signal
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        xhr.abort();
      });
    }

    console.log('XHR sending request to:', url);
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