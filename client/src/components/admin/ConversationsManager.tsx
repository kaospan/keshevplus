import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { queryClient, apiRequest } from '@/lib/queryClient'
import { useLanguage } from '@/hooks/useLanguage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { MessageCircle, Mail, Phone, User, ChevronDown, ChevronUp, CheckCircle, Bot, Trash2 } from 'lucide-react'
import QuickReplyPicker from '@/components/QuickReplyPicker'

interface Conversation {
  id: number
  visitorName: string
  visitorEmail: string
  visitorPhone: string | null
  title: string
  reviewed: boolean
  createdAt: string
}

interface Message {
  id: number
  conversationId: number
  role: string
  content: string
  createdAt: string
}

const ConversationsManager = () => {
  const { language } = useLanguage()
  const isHe = language === 'he'
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [selectMode, setSelectMode] = useState(false)

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
  })

  const { data: expandedMessages = [] } = useQuery<Message[]>({
    queryKey: [`/api/conversations/${expandedId}/messages`],
    enabled: expandedId !== null,
  })

  const markReviewed = useMutation({
    mutationFn: (id: number) => apiRequest('PATCH', `/api/conversations/${id}/reviewed`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/conversations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] })
      setExpandedId(null)
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => apiRequest('POST', '/api/conversations/bulk-delete', { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] })
      setSelectedIds(new Set())
      setSelectMode(false)
      setExpandedId(null)
    },
  })

  const unreviewedCount = conversations.filter(c => !c.reviewed).length

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === conversations.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(conversations.map(c => c.id)))
    }
  }

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return
    const msg = isHe
      ? `למחוק ${selectedIds.size} שיחות?`
      : `Delete ${selectedIds.size} conversations?`
    if (window.confirm(msg)) {
      bulkDeleteMutation.mutate(Array.from(selectedIds))
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
            <CardTitle>
              {isHe ? 'שיחות צ׳אט' : 'Chat Conversations'}
              {unreviewedCount > 0 && (
                <Badge variant="secondary" className="ms-2">{unreviewedCount}</Badge>
              )}
            </CardTitle>
          </div>
          {conversations.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectMode(!selectMode)
                if (selectMode) setSelectedIds(new Set())
              }}
              data-testid="button-toggle-select-conversations"
            >
              {selectMode ? (isHe ? 'ביטול' : 'Cancel') : (isHe ? 'בחירה מרובה' : 'Multi-Select')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {selectMode && conversations.length > 0 && (
          <div className="flex items-center gap-3 mb-3 p-2 border rounded-md bg-muted/30 flex-wrap">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedIds.size === conversations.length && conversations.length > 0}
                onCheckedChange={toggleSelectAll}
                data-testid="checkbox-select-all-conversations"
              />
              <span className="text-sm">
                {isHe ? 'בחר הכל' : 'Select All'}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} {isHe ? 'נבחרו' : 'selected'}
            </span>
            {selectedIds.size > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/30"
                onClick={handleBulkDelete}
                disabled={bulkDeleteMutation.isPending}
                data-testid="button-bulk-delete-conversations"
              >
                <Trash2 className="h-4 w-4 me-1" />
                {isHe ? `מחק (${selectedIds.size})` : `Delete (${selectedIds.size})`}
              </Button>
            )}
          </div>
        )}

        {conversations.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            {isHe ? 'אין שיחות עדיין' : 'No conversations yet'}
          </p>
        ) : (
          <div className="space-y-3">
            {conversations.map(conv => {
              const isExpanded = expandedId === conv.id
              return (
                <div
                  key={conv.id}
                  className={`border rounded-md overflow-visible ${selectedIds.has(conv.id) ? 'ring-2 ring-primary/40' : ''}`}
                  data-testid={`conversation-${conv.id}`}
                >
                  <div className="flex items-center gap-2">
                    {selectMode && (
                      <div className="ps-3">
                        <Checkbox
                          checked={selectedIds.has(conv.id)}
                          onCheckedChange={() => toggleSelect(conv.id)}
                          data-testid={`checkbox-conversation-${conv.id}`}
                        />
                      </div>
                    )}
                    <div
                      className="flex items-center justify-between gap-2 p-3 cursor-pointer hover-elevate flex-1"
                      onClick={() => setExpandedId(isExpanded ? null : conv.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 flex-wrap">
                        <div className="shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{conv.visitorName}</span>
                            {!conv.reviewed && (
                              <Badge variant="default" className="text-xs">
                                {isHe ? 'חדש' : 'New'}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {conv.visitorEmail}
                            </span>
                            {conv.visitorPhone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {conv.visitorPhone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {new Date(conv.createdAt).toLocaleString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t p-3 space-y-3">
                      <div className="max-h-[500px] overflow-y-auto space-y-4 bg-muted/30 rounded-md p-4">
                        {expandedMessages.length === 0 ? (
                          <p className="text-center text-muted-foreground text-xs py-4">
                            {isHe ? 'אין הודעות בשיחה זו' : 'No messages in this conversation'}
                          </p>
                        ) : (
                          expandedMessages.map(message => (
                            <div
                              key={message.id}
                              className={`flex flex-col gap-1 ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                              data-testid={`msg-${message.id}`}
                            >
                              <div className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                {message.role === 'assistant' ? (
                                  <div className="shrink-0 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                                    <Bot className="h-3 w-3 text-primary" />
                                  </div>
                                ) : (
                                  <div className="shrink-0 h-5 w-5 rounded-full bg-muted flex items-center justify-center mt-1">
                                    <User className="h-3 w-3 text-muted-foreground" />
                                  </div>
                                )}
                                <div
                                  className={`rounded-lg px-3 py-1.5 max-w-[90%] text-xs whitespace-pre-wrap ${
                                    message.role === 'user'
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-background border shadow-sm'
                                  }`}
                                >
                                  {message.content}
                                </div>
                              </div>
                              <span className="text-[10px] text-muted-foreground px-7">
                                {new Date(message.createdAt).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                      <QuickReplyPicker
                        channel="chat"
                        clientQuestion={[...expandedMessages].reverse().find(message => message.role === "user")?.content || ""}
                        compact
                        onInsert={(text) => {
                          const subject = isHe ? "קשב פלוס - בהמשך לשיחתך" : "Keshev Plus - Following up on your chat";
                          window.location.href = `mailto:${conv.visitorEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
                        }}
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        {!conv.reviewed && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markReviewed.mutate(conv.id)}
                            disabled={markReviewed.isPending}
                            data-testid={`button-review-${conv.id}`}
                          >
                            <CheckCircle className="h-4 w-4 me-1" />
                            {isHe ? 'סמן כנקרא' : 'Mark as Reviewed'}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30"
                          onClick={() => {
                            if (window.confirm(isHe ? `למחוק את השיחה עם ${conv.visitorName}?` : `Delete conversation with ${conv.visitorName}?`)) {
                              deleteMutation.mutate(conv.id)
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-conversation-${conv.id}`}
                        >
                          <Trash2 className="h-4 w-4 me-1" />
                          {isHe ? 'מחק' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ConversationsManager
