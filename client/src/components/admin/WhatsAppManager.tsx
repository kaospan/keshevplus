import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { queryClient, apiRequest } from '@/lib/queryClient'
import { useLanguage } from '@/hooks/useLanguage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Phone, Send, User } from 'lucide-react'
import { SiWhatsapp } from 'react-icons/si'
import QuickReplyPicker from '@/components/QuickReplyPicker'

interface WhatsAppConversation {
  phone: string
  clientId: number | null
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
}

interface WhatsAppMessage {
  id: number
  clientId: number | null
  waMessageId: string | null
  phone: string
  direction: 'inbound' | 'outbound'
  content: string
  mediaUrl: string | null
  status: string
  rawPayload: any
  createdAt: string
}

const WhatsAppManager = () => {
  const { language } = useLanguage()
  const isHe = language === 'he'
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: conversations = [], isLoading } = useQuery<WhatsAppConversation[]>({
    queryKey: ['/api/whatsapp/conversations'],
  })

  const { data: messages = [] } = useQuery<WhatsAppMessage[]>({
    queryKey: ['/api/whatsapp/messages', selectedPhone],
    enabled: selectedPhone !== null,
    queryFn: async () => {
      const res = await fetch(`/api/whatsapp/messages/${encodeURIComponent(selectedPhone!)}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch messages')
      return res.json()
    },
  })

  const sendMutation = useMutation({
    mutationFn: (body: { phone: string; message: string }) =>
      apiRequest('POST', '/api/whatsapp/send', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/conversations'] })
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/messages', selectedPhone] })
      setMessageText('')
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!selectedPhone || !messageText.trim()) return
    sendMutation.mutate({ phone: selectedPhone, message: messageText.trim() })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          {isHe ? 'טוען שיחות...' : 'Loading conversations...'}
        </CardContent>
      </Card>
    )
  }

  const selectedConversation = conversations.find(c => c.phone === selectedPhone)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <SiWhatsapp className="h-5 w-5 text-green-600 dark:text-green-400" />
          <CardTitle data-testid="text-whatsapp-title">
            {isHe ? 'שיחות וואטסאפ' : 'WhatsApp Conversations'}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="whatsapp-empty-state">
            <SiWhatsapp className="h-12 w-12 text-green-600 dark:text-green-400 mb-4 opacity-40" />
            <p className="text-muted-foreground text-sm">
              {isHe ? 'אין שיחות וואטסאפ עדיין' : 'No WhatsApp conversations yet'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-4 min-h-[500px]">
            <div className="w-full md:w-1/3 border rounded-md overflow-y-auto max-h-[600px]" data-testid="whatsapp-conversation-list">
              {conversations.map(conv => (
                <div
                  key={conv.phone}
                  className={`flex items-center gap-3 p-3 cursor-pointer hover-elevate border-b last:border-b-0 ${
                    selectedPhone === conv.phone ? 'bg-muted' : ''
                  }`}
                  onClick={() => setSelectedPhone(conv.phone)}
                  data-testid={`whatsapp-conversation-${conv.phone}`}
                >
                  <div className="shrink-0 h-8 w-8 rounded-full bg-green-600/10 dark:bg-green-400/10 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate" data-testid={`text-phone-${conv.phone}`}>
                        {conv.phone}
                      </span>
                      {conv.unreadCount > 0 && (
                        <Badge variant="default" className="bg-green-600 dark:bg-green-500 text-white text-xs" data-testid={`badge-unread-${conv.phone}`}>
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                    {conv.clientId && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        {isHe ? `לקוח #${conv.clientId}` : `Client #${conv.clientId}`}
                      </span>
                    )}
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {conv.lastMessage}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(conv.lastMessageAt).toLocaleString(isHe ? 'he-IL' : 'en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex-1 border rounded-md flex flex-col min-h-[400px]" data-testid="whatsapp-thread-panel">
              {!selectedPhone ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  {isHe ? 'בחר שיחה מהרשימה' : 'Select a conversation from the list'}
                </div>
              ) : (
                <>
                  <div className="p-3 border-b flex items-center gap-2 flex-wrap">
                    <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-sm" data-testid="text-selected-phone">{selectedPhone}</span>
                    {selectedConversation?.clientId && (
                      <Badge variant="secondary" className="text-xs">
                        <User className="h-3 w-3 me-1" />
                        {isHe ? `לקוח #${selectedConversation.clientId}` : `Client #${selectedConversation.clientId}`}
                      </Badge>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="whatsapp-messages">
                    {messages.length === 0 ? (
                      <p className="text-center text-muted-foreground text-xs py-4">
                        {isHe ? 'אין הודעות בשיחה זו' : 'No messages in this conversation'}
                      </p>
                    ) : (
                      messages.map(msg => {
                        const isInbound = msg.direction === 'inbound'
                        const alignEnd = isHe ? !isInbound : isInbound
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col gap-0.5 ${alignEnd ? 'items-end' : 'items-start'}`}
                            data-testid={`whatsapp-msg-${msg.id}`}
                          >
                            <div
                              className={`rounded-lg px-3 py-1.5 max-w-[85%] text-sm whitespace-pre-wrap ${
                                isInbound
                                  ? 'bg-muted'
                                  : 'bg-green-600 dark:bg-green-700 text-white'
                              }`}
                            >
                              {msg.content}
                            </div>
                            <div className="flex items-center gap-2 px-1">
                              <span className="text-xs text-muted-foreground">
                                {new Date(msg.createdAt).toLocaleString(isHe ? 'he-IL' : 'en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {isInbound
                                  ? (isHe ? 'נכנסת' : 'Inbound')
                                  : (isHe ? 'יוצאת' : 'Outbound')}
                              </span>
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-3 border-t space-y-2">
                    <QuickReplyPicker
                      channel="whatsapp"
                      clientQuestion={[...messages].reverse().find(msg => msg.direction === 'inbound')?.content || ''}
                      compact
                      onInsert={text => setMessageText(text)}
                    />
                    <div className="flex items-center gap-2">
                    <Input
                      value={messageText}
                      onChange={e => setMessageText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={isHe ? 'הקלד הודעה...' : 'Type a message...'}
                      className="flex-1"
                      dir={isHe ? 'rtl' : 'ltr'}
                      data-testid="input-whatsapp-message"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!messageText.trim() || sendMutation.isPending}
                      data-testid="button-send-whatsapp"
                    >
                      <Send className={`h-4 w-4 ${isHe ? 'ml-1' : 'mr-1'}`} />
                      {isHe ? 'שלח' : 'Send'}
                    </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default WhatsAppManager
