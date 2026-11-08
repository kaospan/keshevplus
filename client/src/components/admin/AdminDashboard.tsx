import { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useLanguage } from '@/hooks/useLanguage'
import { LanguageSelector } from '../LanguageSelector'
import { ThemeToggle } from '../ThemeToggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LogOut, Users, Settings, BarChart3, Globe, Save, Calendar, ClipboardList, Languages, Inbox, Bell, MessageCircle, Eye, Phone } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/queryClient'
import { ALL_LANGUAGES, type LanguageSettings, type SupportedLanguage, DEFAULT_LANGUAGE_SETTINGS, BILINGUAL_CODES, getEnabledLanguageCodes } from '@/i18n/config'
import type { WidgetSettings } from '@shared/schema'
import TranslationManager from './TranslationManager'
import QuestionnaireSubmissions from './QuestionnaireSubmissions'
import AppointmentsManager from './AppointmentsManager'
import ClientsManager from './ClientsManager'
import ContactsManager from './ContactsManager'
import ConversationsManager from './ConversationsManager'
import EmailNotificationSettings from './EmailNotificationSettings'
import VisualEditor from './VisualEditor'
import WhatsAppManager from './WhatsAppManager'
import QuickRepliesManager from './QuickRepliesManager'

const languageCodeClass = "inline-flex w-6 shrink-0 justify-center font-sans text-sm font-semibold leading-none text-muted-foreground"
const languageNameClass = "font-sans text-sm leading-none"

const AdminDashboard = () => {
  const { user, signOut } = useAuth()
  const { language } = useLanguage()
  const isHe = language === 'he'
  const { toast } = useToast()
  const [langSettings, setLangSettings] = useState<LanguageSettings>(DEFAULT_LANGUAGE_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  interface BadgeCounts {
    unreadContacts: number
    pendingAppointments: number
    unreviewedQuestionnaires: number
    unreviewedConversations: number
    newLeads: number
  }

  const { data: badgeCounts } = useQuery<BadgeCounts>({
    queryKey: ['/api/admin/badge-counts'],
    refetchInterval: 30000,
  })

  const tabBadgeMap: Record<string, number> = {
    contacts: badgeCounts?.unreadContacts ?? 0,
    appointments: badgeCounts?.pendingAppointments ?? 0,
    clients: badgeCounts?.newLeads ?? 0,
    conversations: badgeCounts?.unreviewedConversations ?? 0,
    questionnaires: badgeCounts?.unreviewedQuestionnaires ?? 0,
  }

  const totalBadges = Object.values(tabBadgeMap).reduce((a, b) => a + b, 0)

  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>({ showChat: true, showAccessibility: true, showWhatsApp: true })

  useEffect(() => {
    fetch('/api/settings/widgets')
      .then(res => res.json())
      .then(data => setWidgetSettings(data))
      .catch(() => {})
  }, [])

  const handleSaveWidgetSettings = async () => {
    try {
      await apiRequest('PUT', '/api/settings/widgets', widgetSettings)
      toast({ title: isHe ? 'ההגדרות נשמרו' : 'Settings saved' })
    } catch {
      toast({ title: isHe ? 'שגיאה' : 'Error', variant: 'destructive' })
    }
  }

  useEffect(() => {
    fetch('/api/settings/language', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          const enabledLanguages = getEnabledLanguageCodes(data)
          const defaultLanguage = enabledLanguages.includes(data.defaultLanguage)
            ? data.defaultLanguage
            : enabledLanguages[0]
          setLangSettings({ ...DEFAULT_LANGUAGE_SETTINGS, ...data, enabledLanguages, defaultLanguage })
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  const handleSignOut = async () => {
    await signOut()
  }

  const handleSaveLanguageSettings = async () => {
    setSaving(true)
    try {
      const enabledLanguages = getEnabledLanguageCodes(langSettings)
      const payload = {
        ...langSettings,
        enabledLanguages,
        mode: isBilingualSelection(enabledLanguages) ? 'bilingual' : 'multilingual',
        defaultLanguage: enabledLanguages.includes(langSettings.defaultLanguage)
          ? langSettings.defaultLanguage
          : enabledLanguages[0],
      }
      await apiRequest('PUT', '/api/settings/language', payload)
      setLangSettings(payload)
      toast({
        title: isHe ? 'ההגדרות נשמרו' : 'Settings saved',
        description: isHe ? 'הגדרות השפה עודכנו בהצלחה.' : 'Language settings have been updated successfully.'
      })
    } catch (error) {
      toast({
        title: isHe ? 'שגיאה' : 'Error',
        description: isHe ? 'שמירת הגדרות השפה נכשלה.' : 'Failed to save language settings.',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const availableCodes = getEnabledLanguageCodes(langSettings)
  const availableForDefault = ALL_LANGUAGES.filter(l => availableCodes.includes(l.code))

  useEffect(() => {
    if (!availableCodes.includes(langSettings.defaultLanguage)) {
      setLangSettings(prev => ({ ...prev, defaultLanguage: availableCodes[0] ?? 'he' }))
    }
  }, [langSettings.defaultLanguage, availableCodes])

  const handleToggleDisplayLanguage = (code: SupportedLanguage, checked: boolean) => {
    setLangSettings(prev => {
      const current = getEnabledLanguageCodes(prev)
      const next = checked
        ? Array.from(new Set([...current, code]))
        : current.filter(item => item !== code)

      if (!next.length) return prev

      return {
        ...prev,
        enabledLanguages: next,
        mode: isBilingualSelection(next) ? 'bilingual' : 'multilingual',
        defaultLanguage: next.includes(prev.defaultLanguage) ? prev.defaultLanguage : next[0],
      }
    })
  }

  const isBilingualSelection = (codes: SupportedLanguage[]) => {
    return codes.length === BILINGUAL_CODES.length && BILINGUAL_CODES.every(code => codes.includes(code))
  }

  const tabs = [
    { value: 'overview', icon: BarChart3, he: 'סקירה כללית', en: 'Overview' },
    { value: 'contacts', icon: Inbox, he: 'פניות באתר', en: 'Contacts' },
    { value: 'appointments', icon: Calendar, he: 'פגישות', en: 'Appointments' },
    { value: 'clients', icon: Users, he: 'לידים ולקוחות', en: 'Leads & Clients' },
    { value: 'conversations', icon: MessageCircle, he: 'שיחות צ׳אט', en: 'Conversations' },
    { value: 'whatsapp', icon: Phone, he: 'וואטסאפ', en: 'WhatsApp' },
    { value: 'quick-replies', icon: MessageCircle, he: 'תשובות מהירות', en: 'Quick Replies' },
    { value: 'questionnaires', icon: ClipboardList, he: 'שאלונים', en: 'Questionnaires' },
    { value: 'visual-editor', icon: Eye, he: 'עורך ויזואלי', en: 'Visual Editor' },
    { value: 'translations', icon: Languages, he: 'תרגומים', en: 'Translations' },
    { value: 'settings', icon: Settings, he: 'הגדרות', en: 'Settings' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <header className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-40 pt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-semibold">{isHe ? 'לוח בקרה' : 'Admin Dashboard'}</h1>
                <p className="text-sm text-muted-foreground">
                  {isHe ? `ברוך הבא, ${user?.email}` : `Welcome back, ${user?.email}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {totalBadges > 0 && (
                <div className="flex items-center gap-1.5" data-testid="header-notifications">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="destructive" data-testid="badge-total">{totalBadges}</Badge>
                </div>
              )}
              <LanguageSelector />
              <ThemeToggle />
              <Button variant="outline" onClick={handleSignOut} data-testid="button-signout">
                <LogOut className="w-4 h-4 mr-2" />
                {isHe ? 'התנתקות' : 'Sign Out'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} dir={isHe ? 'rtl' : 'ltr'}>
          <TabsList className="w-full justify-start gap-1 overflow-x-auto flex-nowrap bg-muted/50 p-1 mb-6 h-auto flex-wrap">
            {tabs.map(tab => {
              const count = tabBadgeMap[tab.value] ?? 0
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap relative"
                  data-testid={`tab-${tab.value}`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{isHe ? tab.he : tab.en}</span>
                  {count > 0 && (
                    <Badge variant="destructive" className="text-[10px] leading-none px-1.5 py-0.5 min-w-[18px] text-center" data-testid={`badge-tab-${tab.value}`}>
                      {count}
                    </Badge>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="hover-elevate cursor-pointer" onClick={() => setActiveTab('contacts')} data-testid="card-contacts">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{isHe ? 'פניות באתר' : 'Contacts'}</CardTitle>
                  <div className="flex items-center gap-2">
                    {(badgeCounts?.unreadContacts ?? 0) > 0 && (
                      <Badge variant="destructive" data-testid="badge-card-contacts">{badgeCounts!.unreadContacts} {isHe ? 'חדשות' : 'new'}</Badge>
                    )}
                    <Inbox className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{isHe ? 'צפייה בפניות מהאתר' : 'View contact submissions'}</p>
                </CardContent>
              </Card>

              <Card className="hover-elevate cursor-pointer" onClick={() => setActiveTab('appointments')} data-testid="card-appointments">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{isHe ? 'פגישות' : 'Appointments'}</CardTitle>
                  <div className="flex items-center gap-2">
                    {(badgeCounts?.pendingAppointments ?? 0) > 0 && (
                      <Badge variant="destructive" data-testid="badge-card-appointments">{badgeCounts!.pendingAppointments} {isHe ? 'ממתינות' : 'pending'}</Badge>
                    )}
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{isHe ? 'צפייה וניהול פגישות' : 'View & manage appointments'}</p>
                </CardContent>
              </Card>

              <Card className="hover-elevate cursor-pointer" onClick={() => setActiveTab('clients')} data-testid="card-total-users">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{isHe ? 'לידים ולקוחות' : 'Leads & Clients'}</CardTitle>
                  <div className="flex items-center gap-2">
                    {(badgeCounts?.newLeads ?? 0) > 0 && (
                      <Badge variant="destructive" data-testid="badge-card-leads">{badgeCounts!.newLeads} {isHe ? 'לידים' : 'leads'}</Badge>
                    )}
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{isHe ? 'ניהול לידים ולקוחות' : 'Manage leads & clients'}</p>
                </CardContent>
              </Card>

              <Card className="hover-elevate cursor-pointer" onClick={() => setActiveTab('conversations')} data-testid="card-conversations">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{isHe ? 'שיחות צ׳אט' : 'Conversations'}</CardTitle>
                  <div className="flex items-center gap-2">
                    {(badgeCounts?.unreviewedConversations ?? 0) > 0 && (
                      <Badge variant="destructive" data-testid="badge-card-conversations">{badgeCounts!.unreviewedConversations} {isHe ? 'חדשות' : 'new'}</Badge>
                    )}
                    <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{isHe ? 'צפייה בשיחות צ׳אט' : 'View chat conversations'}</p>
                </CardContent>
              </Card>

              <Card className="hover-elevate cursor-pointer" onClick={() => setActiveTab('whatsapp')} data-testid="card-whatsapp">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{isHe ? 'וואטסאפ' : 'WhatsApp'}</CardTitle>
                  <Phone className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{isHe ? 'צפייה בשיחות וואטסאפ' : 'View WhatsApp conversations'}</p>
                </CardContent>
              </Card>

              <Card className="hover-elevate cursor-pointer" onClick={() => setActiveTab('questionnaires')} data-testid="card-questionnaires">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{isHe ? 'שאלונים' : 'Questionnaires'}</CardTitle>
                  <div className="flex items-center gap-2">
                    {(badgeCounts?.unreviewedQuestionnaires ?? 0) > 0 && (
                      <Badge variant="destructive" data-testid="badge-card-questionnaires">{badgeCounts!.unreviewedQuestionnaires} {isHe ? 'חדשים' : 'new'}</Badge>
                    )}
                    <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{isHe ? 'צפייה בהגשות שאלונים' : 'View questionnaire submissions'}</p>
                </CardContent>
              </Card>

              <Card className="hover-elevate cursor-pointer" onClick={() => setActiveTab('settings')} data-testid="card-settings">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{isHe ? 'הגדרות' : 'Settings'}</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{isHe ? 'שפה והתראות' : 'Language & notifications'}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ContactsManager />
              <AppointmentsManager />
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="mt-0">
            <ContactsManager />
          </TabsContent>

          <TabsContent value="appointments" className="mt-0">
            <AppointmentsManager />
          </TabsContent>

          <TabsContent value="clients" className="mt-0">
            <ClientsManager />
          </TabsContent>

          <TabsContent value="conversations" className="mt-0">
            <ConversationsManager />
          </TabsContent>

          <TabsContent value="whatsapp" className="mt-0">
            <WhatsAppManager />
          </TabsContent>

          <TabsContent value="quick-replies" className="mt-0">
            <QuickRepliesManager />
          </TabsContent>

          <TabsContent value="questionnaires" className="mt-0">
            <QuestionnaireSubmissions />
          </TabsContent>

          <TabsContent value="visual-editor" className="mt-0">
            <VisualEditor />
          </TabsContent>

          <TabsContent value="translations" className="mt-0">
            <TranslationManager />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>{isHe ? 'הגדרות שפה' : 'Language Settings'}</CardTitle>
                  </div>
                  <CardDescription>{isHe ? 'שליטה בחוויה הרב-לשונית באתר' : 'Control the multilingual experience on your website'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="multilingual-toggle" className="text-sm font-medium">
                        {isHe ? 'תמיכה רב-לשונית' : 'Multilingual Support'}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {isHe ? 'הצגת בורר שפות באתר' : 'Show the language selector on the website'}
                      </p>
                    </div>
                    <Switch
                      id="multilingual-toggle"
                      checked={langSettings.enabled}
                      onCheckedChange={(checked) =>
                        setLangSettings(prev => ({ ...prev, enabled: checked }))
                      }
                      data-testid="switch-multilingual"
                    />
                  </div>

                  {langSettings.enabled && (
                    <>
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">
                          {isHe ? 'שפות מוצגות' : 'Displayed Languages'}
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {ALL_LANGUAGES.map(lang => {
                            const checked = availableCodes.includes(lang.code)
                            const isLastSelected = checked && availableCodes.length === 1

                            return (
                              <label
                                key={lang.code}
                                className="flex items-center gap-3 rounded-md border p-3 text-sm cursor-pointer hover:bg-muted/50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
                              >
                                <Checkbox
                                  checked={checked}
                                  disabled={isLastSelected}
                                  onCheckedChange={(value) => handleToggleDisplayLanguage(lang.code, value === true)}
                                  data-testid={`checkbox-language-${lang.code}`}
                                />
                                <span className="flex items-center gap-2">
                                  <span className={languageCodeClass} aria-hidden="true">{lang.flag}</span>
                                  <span className={languageNameClass}>{lang.nativeName}</span>
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="default-language" className="text-sm font-medium">
                          {isHe ? 'שפת ברירת מחדל' : 'Default Language'}
                        </Label>
                        <Select
                          value={langSettings.defaultLanguage}
                          onValueChange={(value: string) =>
                            setLangSettings(prev => ({ ...prev, defaultLanguage: value as SupportedLanguage }))
                          }
                        >
                          <SelectTrigger id="default-language" data-testid="select-default-language">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableForDefault.map(lang => (
                              <SelectItem key={lang.code} value={lang.code} data-testid={`option-default-${lang.code}`}>
                                <span className="flex items-center gap-2">
                                  <span className={languageCodeClass} aria-hidden="true">{lang.flag}</span>
                                  <span className={languageNameClass}>{lang.nativeName}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <Button
                    onClick={handleSaveLanguageSettings}
                    disabled={saving || !loaded}
                    className="w-full"
                    data-testid="button-save-language"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving
                      ? (isHe ? 'שומר...' : 'Saving...')
                      : (isHe ? 'שמירת הגדרות שפה' : 'Save Language Settings')}
                  </Button>
                </CardContent>
              </Card>

              <EmailNotificationSettings />
              
              <Card>
                <CardHeader>
                  <CardTitle>{isHe ? 'הגדרות ווידג׳טים' : 'Widget Settings'}</CardTitle>
                  <CardDescription>{isHe ? 'שליטה על הצגת אלמנטים צפים באתר' : 'Control visibility of floating site elements'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>{isHe ? 'הצג צ׳אט' : 'Show Chat'}</Label>
                    <Switch checked={widgetSettings.showChat} onCheckedChange={v => setWidgetSettings(p => ({ ...p, showChat: v }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>{isHe ? 'הצג נגישות' : 'Show Accessibility'}</Label>
                    <Switch checked={widgetSettings.showAccessibility} onCheckedChange={v => setWidgetSettings(p => ({ ...p, showAccessibility: v }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>{isHe ? 'הצג וואטסאפ' : 'Show WhatsApp'}</Label>
                    <Switch checked={widgetSettings.showWhatsApp} onCheckedChange={v => setWidgetSettings(p => ({ ...p, showWhatsApp: v }))} />
                  </div>
                  <Button onClick={handleSaveWidgetSettings} className="w-full mt-4">
                    <Save className="w-4 h-4 mr-2" />
                    {isHe ? 'שמור הגדרות ווידג׳טים' : 'Save Widget Settings'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default AdminDashboard
