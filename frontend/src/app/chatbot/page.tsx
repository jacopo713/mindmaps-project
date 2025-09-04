'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import Link from 'next/link'
import { Chat, Message } from '../../types'
import { StorageManager } from '../../utils/storage'
import { groupChatsByDate } from '../../utils/dateUtils'
import { FirestoreRepo, MindMapsRepo } from '../../utils/firestoreRepo'
import { auth } from '../../utils/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'

export default function ChatbotPage() {
  const router = useRouter()
  const [authReady, setAuthReady] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChat, setCurrentChat] = useState<Chat | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [editingChat, setEditingChat] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u)
      setAuthReady(true)
      if (!u) {
        router.replace('/login')
      } else {
        initializeApp(u)
      }
    })
    return () => unsub()
  }, [router])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      // Don't close menu if clicking on the menu button or menu itself
      if (!target.closest('.menu-container')) {
        setActiveMenu(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const initializeApp = async (user?: any) => {
    const u = user || currentUser
    // If logged, try Firestore first
    if (u) {
      // Prune stale context maps against current Firestore maps
      try {
        const maps = await MindMapsRepo.list(u.uid)
        StorageManager.pruneContextMaps(maps.map(m => m.id))
      } catch {}

      const remoteChats = await FirestoreRepo.listChats(u.uid)
      if (remoteChats.length > 0) {
        setChats(remoteChats)
        // Load first chat messages
        const first = remoteChats[0]
        const msgs = await FirestoreRepo.listMessages(u.uid, first.id)
        setCurrentChat({ ...first, messages: msgs })
        return
      }
    }
    // Fallback to local storage (guest or no remote data)
    const localChats = StorageManager.getChats()
    setChats(localChats)
    if (localChats.length === 0) {
      const firstChat = StorageManager.createChat('New Chat')
      setChats([firstChat])
      setCurrentChat(firstChat)
    } else {
      setCurrentChat(localChats[0])
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !currentChat) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now()
    }

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: Date.now()
    }

    const newMessages = [...currentChat.messages, userMessage, assistantMessage]
    const updatedChat = { ...currentChat, messages: newMessages }
    setCurrentChat(updatedChat)
    setInputValue('')
    setIsLoading(true)

    try {
      abortControllerRef.current = new AbortController()
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
      // Build context prefix from selected maps (filter against Firestore when logged)
      let contextMaps = StorageManager.getContextMaps()
      if (currentUser) {
        try {
          const maps = await MindMapsRepo.list(currentUser.uid)
          const valid = new Set(maps.map(m => m.id))
          contextMaps = contextMaps.filter(m => valid.has(m.id))
          StorageManager.pruneContextMaps(maps.map(m => m.id))
        } catch {}
      }
      const contextPrefix = contextMaps.length > 0
        ? `Contesto mappe (JSON):\n${contextMaps.map(m => `# ${m.title} (id:${m.id})\n${JSON.stringify(m.json)}`).join('\n\n')}\n\n` : ''

      const response = await fetch(`${backendUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...currentChat.messages, { ...userMessage, content: contextPrefix + userMessage.content }].map(({ id: _id, isStreaming: _isStreaming, timestamp: _timestamp, ...msg }) => msg)
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
                setCurrentChat(prev => {
                  if (!prev) return prev
                  const finalMessages = prev.messages.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, isStreaming: false }
                      : msg
                  )
                  const finalChat = { ...prev, messages: finalMessages }
                  
                  // Save to storage / firestore
                  StorageManager.updateChat(currentChat.id, finalMessages)
                  if (currentUser) {
                    FirestoreRepo.upsertMessages(currentUser.uid, currentChat.id, finalMessages).catch(() => {})
                  }
                  setChats(prevChats => 
                    prevChats.map(chat => 
                      chat.id === currentChat.id ? finalChat : chat
                    )
                  )
                  
                  return finalChat
                })
                break
              }

              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  setCurrentChat(prev => {
                    if (!prev) return prev
                    return {
                      ...prev,
                      messages: prev.messages.map(msg =>
                        msg.id === assistantMessage.id
                          ? { ...msg, content: msg.content + parsed.content }
                          : msg
                      )
                    }
                  })
                }
              } catch (e) {
                console.error('Failed to parse JSON:', e)
              }
            }
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error:', error)
        setCurrentChat(prev => {
          if (!prev) return prev
          return {
            ...prev,
            messages: prev.messages.map(msg =>
              msg.id === assistantMessage.id
                ? { ...msg, content: 'Errore nella connessione con DeepSeek API', isStreaming: false }
                : msg
            )
          }
        })
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleNewChat = async () => {
    // Se la chat corrente è già vuota, non creare una nuova chat
    if (currentChat && currentChat.messages.length === 0) {
      return
    }
    const newChat = currentUser ? await FirestoreRepo.createChat(currentUser.uid) : StorageManager.createChat()
    setChats(prev => [newChat, ...prev])
    setCurrentChat(newChat)
  }

  const handleChatSelect = async (chat: Chat) => {
    if (currentUser) {
      const msgs = await FirestoreRepo.listMessages(currentUser.uid, chat.id)
      setCurrentChat({ ...chat, messages: msgs })
    } else {
      setCurrentChat(chat)
    }
  }

  const handleDeleteChat = async (chatId: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questa conversazione?')) {
      let updatedChats: Chat[] = []
      if (currentUser) {
        await FirestoreRepo.deleteChat(currentUser.uid, chatId)
        updatedChats = await FirestoreRepo.listChats(currentUser.uid)
      } else {
        StorageManager.deleteChat(chatId)
        updatedChats = StorageManager.getChats()
      }
      setChats(updatedChats)
      
      // If current chat was deleted, select first available chat
      const currentChatExists = updatedChats.find(chat => chat.id === currentChat?.id)
      if (!currentChatExists) {
        setCurrentChat(updatedChats.length > 0 ? updatedChats[0] : null)
      }
      setActiveMenu(null)
    }
  }

  const handleRenameChat = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId)
    if (chat) {
      setEditingChat(chatId)
      setEditTitle(chat.title)
      setActiveMenu(null)
    }
  }

  const handleSaveRename = async (chatId: string) => {
    if (editTitle.trim()) {
      let updatedChats: Chat[] = []
      if (currentUser) {
        await FirestoreRepo.renameChat(currentUser.uid, chatId, editTitle.trim())
        updatedChats = await FirestoreRepo.listChats(currentUser.uid)
      } else {
        StorageManager.renameChat(chatId, editTitle.trim())
        updatedChats = StorageManager.getChats()
      }
      setChats(updatedChats)
      
      // Update current chat if it was renamed
      if (currentChat?.id === chatId) {
        const updatedCurrentChat = updatedChats.find(chat => chat.id === chatId)
        if (updatedCurrentChat) {
          setCurrentChat(updatedCurrentChat)
        }
      }
    }
    setEditingChat(null)
    setEditTitle('')
  }

  const handleCancelRename = () => {
    setEditingChat(null)
    setEditTitle('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!authReady || !currentUser) {
    return null
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-[260px] bg-[#f9fbff] flex flex-col border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold mb-4">Tree</h1>
          <button 
            onClick={handleNewChat}
            className="w-full bg-white hover:bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium transition-colors mb-3 flex items-center justify-center gap-2"
          >
            <span className="text-base">💬</span>
            New Chat
          </button>
          <Link
            href="/mindmap"
            className="w-full bg-white hover:bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 text-gray-700 no-underline"
          >
            <span className="text-base">🗺️</span>
            New Map
          </Link>
          <Link
            href="/maps"
            className="w-full mt-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 text-gray-700 no-underline"
          >
            <span className="text-base">📚</span>
            Apri mappe concettuali
          </Link>
        </div>
        
        {/* Chat List */}
        <div className="flex-1 overflow-y-auto px-2">
          {groupChatsByDate(chats).map((group) => (
            <div key={group.title} className="mb-4">
              <div className="text-xs font-medium text-gray-500 px-3 py-2 uppercase tracking-wider">
                {group.title}
              </div>
              {group.chats.map((chat) => (
                <div key={chat.id} className="relative group mb-1">
                  {editingChat === chat.id ? (
                    <div className="flex items-center p-3">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveRename(chat.id)
                          } else if (e.key === 'Escape') {
                            handleCancelRename()
                          }
                        }}
                        onBlur={() => handleSaveRename(chat.id)}
                        className="flex-1 text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <button
                        onClick={() => handleChatSelect(chat)}
                        className={`flex-1 text-left p-3 rounded-lg text-sm transition-colors ${
                          currentChat?.id === chat.id 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div className="font-medium truncate">{chat.title}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(chat.updatedAt).toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit'
                          })}
                        </div>
                      </button>
                      <div className="relative menu-container">
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            console.log('Menu button clicked for chat:', chat.id)
                            setActiveMenu(activeMenu === chat.id ? null : chat.id)
                          }}
                          className="opacity-70 group-hover:opacity-100 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-all text-lg font-bold cursor-pointer"
                        >
                          ⋯
                        </button>
                        {activeMenu === chat.id && (
                          <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[120px]">
                            <button
                              onClick={() => handleRenameChat(chat.id)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-700"
                            >
                              Rinomina
                            </button>
                            <button
                              onClick={() => handleDeleteChat(chat.id)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-red-600"
                            >
                              Elimina
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col items-center">
        {!currentChat ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-lg mb-2">Seleziona o crea una nuova chat per iniziare</p>
            </div>
          </div>
        ) : (
          <>
            {/* Messages Container */}
            <div className="flex-1 w-[800px] overflow-y-auto">
              <div className="space-y-4 p-4">
                {currentChat.messages.map((message) => (
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
                  <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                    <ReactMarkdown 
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                        h1: ({children}) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                        h2: ({children}) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                        h3: ({children}) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                        code: ({children, className}) => (
                          className ? 
                            <code className={`${className} text-xs bg-gray-100 rounded px-1 py-0.5`}>{children}</code> :
                            <code className="bg-gray-100 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
                        ),
                        pre: ({children}) => <pre className="bg-gray-100 rounded p-2 overflow-x-auto text-xs my-2">{children}</pre>,
                        ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                        ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                        li: ({children}) => <li className="text-sm">{children}</li>,
                        strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                        em: ({children}) => <em className="italic">{children}</em>,
                        blockquote: ({children}) => <blockquote className="border-l-4 border-gray-300 pl-3 italic text-gray-600 my-2">{children}</blockquote>
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                    {message.isStreaming && message.content === '' && (
                      <div className="flex items-center gap-1 ml-1">
                        <span className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0s'}}></span>
                        <span className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></span>
                        <span className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></span>
                      </div>
                    )}
                  </div>
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
          </>
        )}
      </div>
    </div>
  )
}