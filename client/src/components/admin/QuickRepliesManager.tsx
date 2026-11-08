import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Plus, MessageSquareText, Languages, Smartphone, Monitor } from "lucide-react";
import { DEFAULT_QUICK_REPLIES, REPLY_CATEGORIES, type QuickReplyTemplate, type ReplyLanguage } from "./quickReplyTypes";

export default function QuickRepliesManager() {
  const { language } = useLanguage();
  const isHe = language === "he";
  const [activeLanguage, setActiveLanguage] = useState<ReplyLanguage>("he");
  const [selectedId, setSelectedId] = useState("pricing-private-clinic");
  const [drafts, setDrafts] = useState<QuickReplyTemplate[]>(DEFAULT_QUICK_REPLIES);

  const { isLoading } = useQuery<QuickReplyTemplate[]>({
    queryKey: ["/api/admin/quick-replies"],
    queryFn: async () => {
      const res = await fetch("/api/admin/quick-replies", { credentials: "include" });
      if (!res.ok) throw new Error("Could not load quick replies");
      const rows = await res.json();
      const merged = rows?.length ? rows : DEFAULT_QUICK_REPLIES;
      setDrafts(merged);
      return merged;
    }
  });

  const selected = drafts.find(item => item.id === selectedId) ?? drafts[0];
  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/admin/quick-replies", drafts),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/quick-replies"] })
  });

  const updateSelected = (patch: Partial<QuickReplyTemplate>) => {
    if (!selected) return;
    setDrafts(items => items.map(item => item.id === selected.id ? { ...item, ...patch } : item));
  };
  const updateText = (value: string) => {
    if (!selected) return;
    setDrafts(items => items.map(item => item.id === selected.id
      ? { ...item, text: { ...item.text, [activeLanguage]: value } }
      : item));
  };
  const addTemplate = () => {
    const id = `reply-${Date.now()}`;
    const item: QuickReplyTemplate = {
      id, category: "general", enabled: false,
      labels: { he: "תשובה חדשה", en: "New reply" },
      text: { he: "", en: "" }
    };
    setDrafts(items => [...items, item]);
    setSelectedId(id);
  };

  const categories = useMemo(() => REPLY_CATEGORIES, []);
  if (isLoading) return <Card><CardContent className="p-6">Loading templates…</CardContent></Card>;

  return (
    <div className="space-y-4" dir={isHe ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{isHe ? "תשובות מהירות" : "Quick Replies"}</h2>
          <p className="text-sm text-muted-foreground">{isHe ? "ניהול תשובות מאושרות לכל ערוצי התקשורת" : "Manage approved replies across communication channels"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addTemplate}><Plus className="h-4 w-4 me-2"/>{isHe ? "תשובה חדשה" : "New reply"}</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}><Save className="h-4 w-4 me-2"/>{saveMutation.isPending ? (isHe ? "שומר…" : "Saving…") : (isHe ? "שמירת שינויים" : "Save changes")}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(230px,0.75fr)_minmax(0,1.6fr)]">
        <Card>
          <CardHeader><CardTitle className="text-base">{isHe ? "ספריית תשובות" : "Reply library"}</CardTitle><CardDescription>{isHe ? "בחרו תשובה לעריכה" : "Choose a reply to edit"}</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {drafts.map(item => (
              <button key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full rounded-lg border p-3 text-start transition-colors ${selectedId === item.id ? "border-primary bg-primary/5" : "hover:bg-muted/60"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{item.labels[activeLanguage] || item.labels.he}</span>
                  <Badge variant={item.enabled ? "default" : "secondary"}>{item.enabled ? (isHe ? "פעיל" : "Active") : (isHe ? "טיוטה" : "Draft")}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.text[activeLanguage] || item.text.he || (isHe ? "אין תוכן עדיין" : "No content yet")}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        {selected && <Card className="min-w-0">
          <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="text-base">{isHe ? "עריכת תשובה" : "Edit reply"}</CardTitle><CardDescription>{isHe ? "שתי השפות נשמרות בנפרד תחת אותו מזהה" : "Both languages are stored separately under one shared ID"}</CardDescription></div><div className="flex items-center gap-2 text-sm"><span>{isHe ? "פעילה" : "Enabled"}</span><Switch checked={selected.enabled} onCheckedChange={enabled => updateSelected({ enabled })}/></div></div></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><label className="text-sm font-medium">{isHe ? "שם בעברית" : "Hebrew label"}</label><Input value={selected.labels.he} onChange={e => updateSelected({ labels: { ...selected.labels, he: e.target.value } })}/></div>
              <div className="space-y-1"><label className="text-sm font-medium">English label</label><Input value={selected.labels.en} onChange={e => updateSelected({ labels: { ...selected.labels, en: e.target.value } })}/></div>
            </div>
            <div className="space-y-1"><label className="text-sm font-medium">{isHe ? "קטגוריה" : "Category"}</label><Select value={selected.category} onValueChange={category => updateSelected({ category })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{isHe ? c.he : c.en}</SelectItem>)}</SelectContent></Select></div>
            <Tabs value={activeLanguage} onValueChange={v => setActiveLanguage(v as ReplyLanguage)}>
              <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="he">עברית · RTL</TabsTrigger><TabsTrigger value="en">English · LTR</TabsTrigger></TabsList>
              <TabsContent value="he" className="space-y-2"><Textarea dir="rtl" value={selected.text.he} onChange={e => updateText(e.target.value)} rows={10} className="min-h-56 resize-y leading-7"/><p className="text-xs text-muted-foreground">עריכת הנוסח העברי</p></TabsContent>
              <TabsContent value="en" className="space-y-2"><Textarea dir="ltr" value={selected.text.en} onChange={e => updateText(e.target.value)} rows={10} className="min-h-56 resize-y leading-7"/><p className="text-xs text-muted-foreground">Edit the English version</p></TabsContent>
            </Tabs>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground"><MessageSquareText className="h-4 w-4"/> {isHe ? "תצוגה מקדימה" : "Preview"} <span className="ms-auto flex items-center gap-1"><Smartphone className="h-3.5 w-3.5"/><Monitor className="h-3.5 w-3.5"/></span></div>
              <div dir={activeLanguage === "he" ? "rtl" : "ltr"} className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-background p-3 text-sm leading-6">{selected.text[activeLanguage]}</div>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground"><Languages className="h-4 w-4 shrink-0"/>{isHe ? "שינוי בשפה אחת לא מתורגם אוטומטית. יש לבדוק ולעדכן את הגרסה המקבילה לפני הפעלה." : "Editing one language does not auto-translate the other. Review both versions before enabling."}</div>
          </CardContent>
        </Card>}
      </div>
    </div>
  );
}
