'use client';
import * as React from 'react';
import { Bot, Send } from 'lucide-react';
import { PageHeader } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCoachChat, useAiQuota } from '@/lib/hooks';

interface Msg { role: 'user' | 'assistant'; content: string; }

export default function AiCoachPage() {
  const [messages, setMessages] = React.useState<Msg[]>([
    { role: 'assistant', content: 'Hey! I am your AI coach. Ask me about training, nutrition, recovery, or goal-setting.' },
  ]);
  const [input, setInput] = React.useState('');
  const chat = useCoachChat();
  const { data: quota } = useAiQuota();
  const q: any = quota ?? {};

  const send = () => {
    if (!input.trim() || chat.isPending) return;
    const text = input;
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    chat.mutate({ message: text }, {
      onSuccess: (res: any) => {
        const reply = res?.reply ?? res?.message ?? res?.content ?? "Here's my take — check your connection if this looks empty.";
        setMessages((m) => [...m, { role: 'assistant', content: reply }]);
      },
      onError: () => setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, I hit my limit. Try again shortly.' }]),
    });
  };

  return (
    <div>
      <PageHeader
        title="AI Coach"
        subtitle="Personalized guidance powered by your training data."
        actions={<Badge variant="secondary">{q.remaining ?? '∞'} / {q.limit ?? '∞'} today</Badge>}
      />
      <Card className="flex h-[70vh] flex-col">
        <CardHeader><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-primary" /> Coach conversation</CardTitle></CardHeader>
        <CardContent className="flex flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto pr-2">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {chat.isPending && <div className="text-sm text-muted-foreground">Coach is typing…</div>}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask your coach anything…"
              className="h-11 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={send} disabled={chat.isPending || !input.trim()} size="icon" className="h-11 w-11"><Send className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
