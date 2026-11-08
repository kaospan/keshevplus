import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, MessageSquareText } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import type { ReplyChannel } from "./admin/quickReplyTypes";

interface QuickReply { id: string; category: string; enabled: boolean; labels: { he: string; en: string }; text: { he: string; en: string } }
interface Props { channel: ReplyChannel; clientQuestion?: string; onInsert: (text: string) => void; compact?: boolean }

export default function QuickReplyPicker({ channel, clientQuestion = "", onInsert, compact = false }: Props) {
  const { language } = useLanguage();
  const lang = language === "he" ? "he" : "en";
  const [items, setItems] = useState<QuickReply[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState("");
  const [question, setQuestion] = useState(clientQuestion);
  const [adapting, setAdapting] = useState(false);
  useMemo(() => {
    fetch("/api/quick-replies").then(r => r.ok ? r.json() : []).then(rows => {
      setItems(rows.filter((x: QuickReply) => x.enabled));
      if (rows[0]) { setSelectedId(rows[0].id); setDraft(rows[0].text[lang]); }
    }).catch(() => {});
  }, []);
  const selected = items.find(x => x.id === selectedId);
  const choose = (id: string) => { setSelectedId(id); const item = items.find(x => x.id === id); if (item) setDraft(item.text[lang]); };
  const adapt = async () => {
    if (!selected || !question.trim()) return;
    setAdapting(true);
    try {
      const res = await fetch("/api/quick-replies/adapt", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId: selected.id, question, language: lang, channel }) });
      if (!res.ok) throw new Error("Adaptation failed");
      const data = await res.json();
      if (data.text) setDraft(data.text);
    } finally { setAdapting(false); }
  };
  if (!items.length) return null;
  return <div className="w-full min-w-0 space-y-2 rounded-lg border bg-muted/20 p-3">
    <div className="flex items-center gap-2 text-sm font-medium"><MessageSquareText className="h-4 w-4"/>{lang === "he" ? "תשובות מהירות" : "Quick replies"}</div>
    <Select value={selectedId} onValueChange={choose}><SelectTrigger className="w-full"><SelectValue placeholder={lang === "he" ? "בחירת תשובה" : "Choose a reply"}/></SelectTrigger><SelectContent>{items.map(item => <SelectItem key={item.id} value={item.id}>{item.labels[lang] || item.labels.en}</SelectItem>)}</SelectContent></Select>
    <Textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder={lang === "he" ? "שאלת הלקוח (לא חובה): כדי להתאים את התשובה..." : "Client's question (optional): add context to tailor the reply..."} rows={2}/>
    <Textarea value={draft} onChange={e => setDraft(e.target.value)} dir={lang === "he" ? "rtl" : "ltr"} rows={compact ? 3 : 5} className="resize-y"/>
    <div className="flex flex-wrap justify-end gap-2">
      <Button size="sm" variant="outline" onClick={adapt} disabled={!question.trim() || adapting}><Sparkles className="h-4 w-4 me-1"/>{adapting ? (lang === "he" ? "מתאים…" : "Adapting…") : (lang === "he" ? "התאמה עם AI" : "Adapt with AI")}</Button>
      <Button size="sm" onClick={() => onInsert(draft)} disabled={!draft.trim()}>{lang === "he" ? "הוספה להודעה" : "Insert reply"}</Button>
    </div>
  </div>;
}
