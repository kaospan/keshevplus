import { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useLanguage } from '@/hooks/useLanguage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Mail, Phone, User, Clock, Eye, EyeOff, ChevronDown, ChevronUp, Inbox, Trash2, Filter } from 'lucide-react'
import { SiWhatsapp } from 'react-icons/si'
import { apiRequest, queryClient } from '@/lib/queryClient'
import { cn } from '@/lib/utils'
import QuickReplyPicker from '@/components/QuickReplyPicker'
import type { Contact } from '@shared/schema'

const STATUS_CONFIG: Record<string, { he: string; en: string; color: string }> = {
  new: { he: "חדש", en: "New", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  in_progress: { he: "בטיפול", en: "In Progress", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  follow_up: { he: "מעקב", en: "Follow Up", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  closed: { he: "סגור", en: "Closed", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300" },
};

function formatWhatsAppUrl(phone: string, message?: string) {
  const cleaned = phone.replace(/[^0-9+]/g, '').replace(/^0/, '972')
  const params = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${cleaned}${params}`
}

export default function ContactsManager() {
  const { language } = useLanguage()
  const isHe = language === 'he'
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts', statusFilter],
    queryFn: async () => {
      const url = statusFilter === 'all' ? '/api/contacts' : `/api/contacts?status=${statusFilter}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => 
      apiRequest('PATCH', `/api/contacts/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] })
    },
  })

  const markReadMutation = useMutation({
    mutationFn: (id: number) => apiRequest('PATCH', `/api/contacts/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] })
      setExpandedId(null)
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => apiRequest('POST', '/api/contacts/bulk-delete', { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] })
      setSelectedIds(new Set())
      setSelectMode(false)
      setExpandedId(null)
    },
  })

  const unreadCount = contacts.filter(c => !c.read).length

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(contacts.map(c => c.id)))
    }
  }

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return
    const msg = isHe
      ? `למחוק ${selectedIds.size} פניות?`
      : `Delete ${selectedIds.size} submissions?`
    if (window.confirm(msg)) {
      bulkDeleteMutation.mutate(Array.from(selectedIds))
    }
  }

  const formatDate = (dateStr: string | Date) => {
    const d = new Date(dateStr)
    return d.toLocaleString(isHe ? 'he-IL' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{isHe ? 'פניות באתר' : 'Contact Submissions'}</CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {unreadCount > 0 && (
              <Badge variant="destructive" data-testid="badge-unread-count">
                {unreadCount} {isHe ? 'חדשות' : 'new'}
              </Badge>
            )}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isHe ? 'כל הסטטוסים' : 'All Statuses'}</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{isHe ? config.he : config.en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {contacts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectMode(!selectMode)
                  if (selectMode) setSelectedIds(new Set())
                }}
                data-testid="button-toggle-select-contacts"
              >
                {selectMode ? (isHe ? 'ביטול' : 'Cancel') : (isHe ? 'בחירה מרובה' : 'Multi-Select')}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {selectMode && contacts.length > 0 && (
          <div className="flex items-center gap-3 mb-3 p-2 border rounded-md bg-muted/30 flex-wrap">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedIds.size === contacts.length && contacts.length > 0}
                onCheckedChange={toggleSelectAll}
                data-testid="checkbox-select-all-contacts"
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
                data-testid="button-bulk-delete-contacts"
              >
                <Trash2 className="h-4 w-4 me-1" />
                {isHe ? `מחק (${selectedIds.size})` : `Delete (${selectedIds.size})`}
              </Button>
            )}
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {isHe ? 'טוען...' : 'Loading...'}
          </p>
        ) : contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {isHe ? 'אין פניות להצגה' : 'No submissions to display'}
          </p>
        ) : (
          <div className="space-y-2">
            {contacts.map((contact) => {
              const isExpanded = expandedId === contact.id
              const statusInfo = STATUS_CONFIG[contact.status] || STATUS_CONFIG.new
              return (
                <div
                  key={contact.id}
                  className={`border rounded-md transition-colors ${
                    !contact.read ? 'bg-primary/5 border-primary/20' : ''
                  } ${selectedIds.has(contact.id) ? 'ring-2 ring-primary/40' : ''}`}
                  data-testid={`contact-row-${contact.id}`}
                >
                  <div className="flex items-center gap-2">
                    {selectMode && (
                      <div className="ps-3">
                        <Checkbox
                          checked={selectedIds.has(contact.id)}
                          onCheckedChange={() => toggleSelect(contact.id)}
                          data-testid={`checkbox-contact-${contact.id}`}
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3 p-3 flex-1">
                      <button
                        className="flex-1 text-start flex items-center gap-3 min-w-0"
                        onClick={() => setExpandedId(isExpanded ? null : contact.id)}
                        data-testid={`button-toggle-contact-${contact.id}`}
                      >
                        {!contact.read ? (
                          <EyeOff className="h-4 w-4 text-primary shrink-0" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium truncate ${!contact.read ? 'text-primary' : ''}`}>
                              {contact.name}
                            </span>
                            <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 leading-none", statusInfo.color)}>
                              {isHe ? statusInfo.he : statusInfo.en}
                            </Badge>
                            {!contact.read && (
                              <Badge variant="secondary" className="text-xs">
                                {isHe ? 'חדש' : 'New'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {contact.message.substring(0, 80)}{contact.message.length > 80 ? '...' : ''}
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center gap-2 shrink-0">
                        <Select 
                          value={contact.status} 
                          onValueChange={(status) => updateStatusMutation.mutate({ id: contact.id, status })}
                        >
                          <SelectTrigger className="h-7 text-[10px] w-[90px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                              <SelectItem key={key} value={key} className="text-xs">
                                {isHe ? config.he : config.en}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {formatDate(contact.createdAt)}
                        </span>
                        <button onClick={() => setExpandedId(isExpanded ? null : contact.id)}>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0 border-t space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm">{contact.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                          <a href={`tel:${contact.phone}`} className="text-sm text-primary">
                            {contact.phone}
                          </a>
                        </div>
                        {contact.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                            <a href={`mailto:${contact.email}`} className="text-sm text-primary">
                              {contact.email}
                            </a>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-muted-foreground">{formatDate(contact.createdAt)}</span>
                        </div>
                      </div>

                      <div className="rounded-md bg-muted/50 p-3">
                        <p className="text-sm whitespace-pre-wrap">{contact.message}</p>
                      </div>

                      {(contact.email || contact.phone) && (
                        <QuickReplyPicker
                          channel={contact.email ? "email" : "contact"}
                          clientQuestion={contact.message}
                          compact
                          onInsert={(text) => {
                            if (contact.email) {
                              window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(isHe ? "קשב פלוס - בהמשך לפנייתך" : "Keshev Plus - Following up on your inquiry")}&body=${encodeURIComponent(text)}`;
                            } else if (contact.phone) {
                              window.open(formatWhatsAppUrl(contact.phone, text), "_blank", "noopener,noreferrer");
                            }
                          }}
                        />
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        {contact.phone && (
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                            data-testid={`button-whatsapp-contact-${contact.id}`}
                          >
                            <a href={formatWhatsAppUrl(contact.phone, isHe ? `שלום ${contact.name}, פונה אליך מקשב פלוס` : `Hi ${contact.name}, reaching out from KeshevPlus`)} target="_blank" rel="noopener noreferrer">
                              <SiWhatsapp className="h-4 w-4 mr-1 text-[#25D366]" />
                              WhatsApp
                            </a>
                          </Button>
                        )}
                        {!contact.read && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markReadMutation.mutate(contact.id)}
                            disabled={markReadMutation.isPending}
                            data-testid={`button-mark-read-${contact.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {isHe ? 'סמן כנקרא' : 'Mark as Read'}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30"
                          onClick={() => {
                            if (window.confirm(isHe ? `למחוק את הפנייה מ-${contact.name}?` : `Delete submission from ${contact.name}?`)) {
                              deleteMutation.mutate(contact.id)
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-contact-${contact.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
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
