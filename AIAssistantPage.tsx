import React, { useState, useRef, useEffect } from 'react';
import { Bot, Languages, Loader2, RotateCcw, Send, User } from 'lucide-react';
import {
  AssistantLanguage,
  ChatMessage,
  sendAssistantMessage,
} from '../services/aiService';
import { UserRole } from '../types/campuscare';

const LANGUAGE_OPTIONS: Array<{ value: AssistantLanguage; label: string }> = [
  { value: 'auto', label: 'Auto' },
  { value: 'english', label: 'English' },
  { value: 'sinhala', label: 'සිංහල' },
  { value: 'singlish', label: 'Singlish' },
];

const GREETINGS: Record<AssistantLanguage, string> = {
  auto: 'Hello! ආයුබෝවන්! I am the UniFix AI Assistant. You can chat with me in English, සිංහල, or Singlish — I will reply in your language.\n\nTo check real-time status for your specific tickets, open "My Reports".',
  english:
    'Hello! I am the UniFix AI Assistant. I can help you choose the right issue category, prepare clear maintenance descriptions, or understand how report tracking works. Note: To view live status for your specific tickets, open "My Reports".',
  sinhala:
    'ආයුබෝවන්! මම UniFix AI Assistant. ඔබගේ campus ගැටළු වලට සුදුසු category එක තෝරාගැනීමට, පැහැදිලි විස්තරයක් සකස් කිරීමට, සහ report status තේරුම් ගැනීමට මට උදව් කළ හැක. ඔබගේ දැනට ඇති tickets වල status බැලීමට "My Reports" වෙත පිවිසෙන්න.',
  singlish:
    'Hello! Mama UniFix AI Assistant. Oyage campus issue ekata hari category eka thoraganna, honda description ekak hadaganna, saha report status ganath magen ahanna puluwan. Oyage submitted tickets wala live status balanna "My Reports" open karanna.',
};

const QUICK_PROMPTS_BY_LANG: Record<AssistantLanguage, string[]> = {
  auto: [
    'Which category fits a flickering projector or loose outlet?',
    'Lecture hall eke fan eka wada na, mokakda category eka?',
    'විදුලි රැහැනක් කැඩී ඇත. මෙය වාර්තා කරන්නේ කෙසේද?',
    'Mage report eke status eka Pending kiyanne mokakda?',
  ],
  english: [
    'Which category fits a flickering projector or loose outlet?',
    'How do I track the status of my submitted report?',
    'What do Pending, Under Review, and In Progress mean?',
    'What photos should I upload for a plumbing leak?',
  ],
  sinhala: [
    'පන්ති කාමරයේ විදුලි පංකාව වැඩ නැත්නම් කුමන category එක තෝරන්නද?',
    'මගේ report එකේ status එක බලන්නේ කෙසේද?',
    'Pending, Under Review සහ In Progress යන්නෙන් අදහස් කරන්නේ කුමක්ද?',
    'ජල කාන්දුවක් වාර්තා කරද්දී කුමන ඡායාරූප එක් කළ යුතුද?',
  ],
  singlish: [
    'Projector eka flicker wenawa nam mokakda category eka?',
    'Mage submit karapu report eke status eka balanne kohomada?',
    'Pending, Under Review, saha In Progress kiyanne monawada?',
    'Water leak ekak report karaddi mona wage photo ekakda danna one?',
  ],
};

const PLACEHOLDERS: Record<AssistantLanguage, string> = {
  auto: 'Ask in English, සිංහල, or Singlish (e.g., "AC eka wada na, mokakda karanna one?")...',
  english: 'Ask how to categorize or report a campus issue...',
  sinhala: 'ඔබගේ ගැටළුව සිංහලෙන් අසන්න...',
  singlish: 'Oyage prashnaya Singlish walin ahanna (udaa: "Light eka blink wenawa")...',
};

const THINKING_LABEL: Record<AssistantLanguage, string> = {
  auto: 'Thinking...',
  english: 'Thinking...',
  sinhala: 'සිතමින් පවතී...',
  singlish: 'Hithamin innawa...',
};

export function AIAssistantPage({ role }: { role: UserRole }) {
  const [language, setLanguage] = useState<AssistantLanguage>('auto');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: GREETINGS.auto,
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleLanguageChange = (nextLang: AssistantLanguage) => {
    setLanguage(nextLang);
    // Update the welcome greeting cleanly if user hasn't sent any messages yet
    if (messages.length === 1 && messages[0].role === 'model') {
      setMessages([{ role: 'model', text: GREETINGS[nextLang] }]);
    }
  };

  const handleResetChat = () => {
    if (sending) return;
    setError('');
    setInput('');
    setMessages([{ role: 'model', text: GREETINGS[language] }]);
  };

  const submitMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setError('');
    const nextHistory: ChatMessage[] = [...messages, { role: 'user', text: trimmed }];
    setMessages(nextHistory);
    setInput('');
    setSending(true);

    try {
      const reply = await sendAssistantMessage(trimmed, messages, role, language);
      setMessages([...nextHistory, { role: 'model', text: reply }]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to reach UniFix AI Assistant.'
      );
    } finally {
      setSending(false);
    }
  };

  const quickPrompts = QUICK_PROMPTS_BY_LANG[language];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="glass-panel rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#064E3B] font-display">
            UniFix AI Assistant
          </h2>
          <p className="text-xs text-[#52635D] mt-0.5">
            Supports English, සිංහල, and Singlish for reporting guidance & triage help.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          <div
            className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/75 border border-emerald-950/10"
            role="group"
            aria-label="Assistant language"
          >
            <Languages className="w-3.5 h-3.5 text-[#059669] ml-1.5 mr-0.5 shrink-0" />
            {LANGUAGE_OPTIONS.map((opt) => {
              const active = language === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleLanguageChange(opt.value)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#059669] text-white shadow-xs'
                      : 'text-[#064E3B] hover:bg-emerald-50/80'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleResetChat}
            disabled={sending}
            title="Clear conversation"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#064E3B] bg-white/75 border border-emerald-950/10 rounded-xl hover:bg-emerald-50/80 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Quick Prompt Controls */}
      <div className="flex flex-wrap gap-2">
        {quickPrompts.map((q) => (
          <button
            key={q}
            type="button"
            disabled={sending}
            onClick={() => submitMessage(q)}
            className="text-xs font-medium text-[#064E3B] bg-white/80 backdrop-blur-md border border-emerald-950/10 rounded-xl px-3.5 py-2 hover:bg-emerald-50/75 transition-colors text-left"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Glass Chat Thread */}
      <div className="glass-panel rounded-2xl flex flex-col h-[520px] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.role === 'model' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#064E3B] to-[#059669] text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-[#059669] text-white shadow-xs'
                    : 'bg-emerald-50/65 text-[#0F172A]'
                }`}
              >
                {m.text}
              </div>
              {m.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-emerald-950/10 text-[#064E3B] flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#064E3B] to-[#059669] text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-emerald-50/65 rounded-2xl px-4 py-3 text-xs text-[#52635D] flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#059669]" />
                {THINKING_LABEL[language]}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {error && (
          <div className="mx-5 mb-3 px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitMessage(input);
          }}
          className="p-4 border-t border-emerald-950/10 flex items-center gap-3 bg-white/50"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={PLACEHOLDERS[language]}
            className="glass-input flex-1 px-3.5 py-2.5 text-sm rounded-xl"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="px-4 py-2.5 text-sm font-semibold text-white bg-[#059669] rounded-xl hover:bg-[#047857] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
