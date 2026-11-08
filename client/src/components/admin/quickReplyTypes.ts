export type ReplyLanguage = "he" | "en";
export type ReplyChannel = "whatsapp" | "chat" | "email" | "contact";

export interface QuickReplyTemplate {
  id: string;
  category: string;
  enabled: boolean;
  labels: Record<ReplyLanguage, string>;
  text: Record<ReplyLanguage, string>;
}

export const DEFAULT_QUICK_REPLIES: QuickReplyTemplate[] = [
  {
    id: "pricing-private-clinic",
    category: "prices-payments",
    enabled: true,
    labels: { he: "מחירים והסדרים", en: "Prices & insurance arrangements" },
    text: {
      he: "שלום, תודה שפניתם לקשב פלוס.\n\nאנחנו מבינים כמה חשוב לדעת מראש מה העלויות ומה כלול בתהליך, לפני שמחליטים להתקדם.\n\nקשב פלוס היא מרפאה פרטית, ואין לנו הסדרים ישירים עם קופות החולים או חברות הביטוח.\n\nנשמח להסביר לכם על אפשרויות האבחון, מה כלול בתהליך ומה העלויות, כדי שתוכלו לקבל תמונה ברורה ומלאה לפני קבלת החלטה.\n\nאפשר ליצור איתנו קשר בטלפון 055-27-399-27, או פשוט להמשיך להתכתב איתנו כאן.\n\nכמובן, ללא כל התחייבות. נשמח לעזור!",
      en: "Hi! Thank you for reaching out to Keshev Plus.\n\nWe understand how important it is to know the costs and what's included before deciding to proceed.\n\nKeshev Plus is a private clinic, and we don't have direct arrangements with Israel's health funds (Kupot Holim) or insurance companies.\n\nWe're happy to explain our assessment options, what's included, and the costs, so you know exactly what to expect before making any decision.\n\nYou can reach us by phone at 055-27-399-27, or simply continue chatting with us here.\n\nThere's absolutely no obligation. We're happy to help!"
    }
  }
];

export const REPLY_CATEGORIES = [
  { id: "prices-payments", he: "מחירים ותשלומים", en: "Prices & Payments" },
  { id: "new-inquiries", he: "פניות חדשות", en: "New Inquiries" },
  { id: "appointments", he: "קביעת תורים", en: "Appointments" },
  { id: "follow-ups", he: "מעקב ופולואפ", en: "Follow-ups" },
  { id: "moxo", he: "MOXO", en: "MOXO" },
  { id: "general", he: "כללי", en: "General" }
] as const;
