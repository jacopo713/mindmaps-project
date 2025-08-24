'use client'

import { useState, useRef } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim()
    }

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      isStreaming: true
    }

    setMessages(prev => [...prev, userMessage, assistantMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      abortControllerRef.current = new AbortController()
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(({ id, isStreaming, ...msg }) => msg)
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) throw new Error('Network response was not ok')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n').filter(line => line.trim())

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, isStreaming: false }
                      : msg
                  )
                )
                break
              }

              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  setMessages(prev =>
                    prev.map(msg =>
                      msg.id === assistantMessage.id
                        ? { ...msg, content: msg.content + parsed.content }
                        : msg
                    )
                  )
                }
              } catch (e) {
                console.error('Failed to parse JSON:', e)
              }
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error:', error)
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessage.id
              ? { ...msg, content: 'Errore nella connessione con DeepSeek API', isStreaming: false }
              : msg
          )
        )
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleNewChat = () => {
    setMessages([])
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-[260px] bg-[#f9fbff] flex flex-col">
        <div className="p-4">
          <h1 className="text-xl font-semibold mb-4">Tree</h1>
          <button 
            onClick={handleNewChat}
            className="w-full bg-white hover:bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            New Chat
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col items-center">
        {/* Messages Container */}
        <div className="flex-1 w-[800px] overflow-y-auto">
          <div className="space-y-4 p-4">
            {messages.map((message) => (
              <div key={message.id} className="flex">
                {message.role === 'assistant' && (
                  <div className="w-[48px] flex justify-start">
                    <div className="w-[28px] h-[28px] bg-gray-300 rounded-full flex items-center justify-center text-xs">
                      AI
                    </div>
                  </div>
                )}
                <div 
                  className={`${
                    message.role === 'user' 
                      ? 'ml-auto max-w-[752px] bg-[#eff6ff] rounded-lg p-4' 
                      : 'flex-1 max-w-[752px] p-4'
                  }`}
                >
                  <p className="text-sm leading-relaxed">
                    {message.content}
                    {message.isStreaming && (
                      <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse" />
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Spacer */}
        <div className="h-8"></div>

        {/* Input Container */}
        <div className="w-[800px] h-[112px] bg-[#f3f4f6] rounded-xl p-5 relative">
          <div className="w-full">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Scrivi il tuo messaggio..."
              className="w-full resize-none bg-[#f3f4f6] focus:outline-none border-none pr-14"
              rows={2}
            />
          </div>
          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
              inputValue.trim() && !isLoading
                ? 'bg-[#007AFF] hover:bg-[#0056CC] cursor-pointer' 
                : 'bg-[#CCCCCC] cursor-not-allowed'
            }`}
            title={isLoading ? "Invio in corso..." : "Invia messaggio"}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="text-white"
              >
                <path 
                  d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" 
                  fill="currentColor"
                  transform="rotate(-90 12 12)"
                />
              </svg>
            )}
          </button>
        </div>
        
        {/* AI Generated Text */}
        <div className="text-center text-gray-500 mt-2 mb-2" style={{fontSize: '12px', lineHeight: '14px', fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal'}}>
          AI-generated, for reference only
        </div>
      </div>
    </div>
  )
}