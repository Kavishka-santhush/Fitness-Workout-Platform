import React from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Screen } from '@/components/ui/Screen';
import { Badge } from '@/components/ui/Badge';
import { colors, radius, spacing } from '@/lib/theme';
import { haptics } from '@/lib/haptics';
import { useAiQuota, useCoachChat } from '@/hooks/queries';

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTIONS = [
  'Build me a 3-day push/pull/legs split',
  'I stalled on my bench press — what should I change?',
  'How much protein do I need to lose fat?',
  'Design a 20-minute home HIIT workout',
];

/**
 * AI coach chat. Sends the running conversation to `POST /api/ai/coach-chat`
 * and shows the assistant reply, surfacing the member's remaining daily quota
 * from `GET /api/ai/quota`.
 */
export default function AiCoachScreen() {
  const [messages, setMessages] = React.useState<Msg[]>([
    { id: 'seed', role: 'assistant', text: "Hey! I'm your AI coach. Ask me about training, nutrition, recovery, or setting goals." },
  ]);
  const [input, setInput] = React.useState('');
  const chat = useCoachChat();
  const { data: quota } = useAiQuota();

  const remaining = quota?.remaining ?? quota?.requestsRemaining ?? null;
  const limit = quota?.limit ?? quota?.dailyLimit ?? null;

  function send(text: string) {
    const content = text.trim();
    if (!content || chat.isPending) return;
    const userMsg: Msg = { id: `u-${Date.now()}`, role: 'user', text: content };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    chat.mutate(
      { message: content, history: messages.map((m) => ({ role: m.role, content: m.text })) },
      {
        onSuccess: (res: any) => {
          haptics.light();
          const reply = res?.reply ?? res?.message ?? res?.response ?? "Here's my take…";
          setMessages((m) => [...m, { id: `a-${Date.now()}`, role: 'assistant', text: String(reply) }]);
        },
        onError: () => setMessages((m) => [...m, { id: `e-${Date.now()}`, role: 'assistant', text: 'I hit a snag reaching the coach — check your quota or try again.' }]),
      }
    );
  }

  return (
    <Screen scroll={false} bottomGap={0}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => {}}
          renderItem={({ item }) => (
            <View style={[styles.bubbleRow, item.role === 'user' ? styles.rowRight : styles.rowLeft]}>
              {item.role === 'assistant' ? (
                <View style={styles.botIcon}>
                  <Ionicons name="sparkles" size={16} color={colors.primary} />
                </View>
              ) : null}
              <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
                <Text style={{ color: item.role === 'user' ? colors.white : colors.text, fontSize: 15 }}>
                  {item.text}
                </Text>
              </View>
            </View>
          )}
          ListHeaderComponent={
            <View style={styles.header}>
              <Pressable onPress={() => router.back()} hitSlop={10}>
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </Pressable>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text variant="h3">AI Coach</Text>
              </View>
              {remaining != null ? <Badge label={`${remaining}${limit ? `/${limit}` : ''} left`} tone={remaining > 0 ? 'success' : 'danger'} /> : <View style={{ width: 24 }} />}
            </View>
          }
        />

        {messages.length <= 1 ? (
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((s) => (
              <Pressable key={s} onPress={() => send(s)} style={({ pressed }) => [styles.suggestion, pressed && { opacity: 0.85 }]}>
                <Text variant="caption" style={{ color: colors.primary }}>
                  {s}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={remaining === 0 ? 'Daily AI limit reached — upgrade for more.' : 'Ask your coach…'}
            placeholderTextColor={colors.faint}
            multiline
            editable={remaining !== 0}
          />
          <Pressable
            onPress={() => send(input)}
            disabled={!input.trim() || chat.isPending || remaining === 0}
            style={({ pressed }) => [styles.sendBtn, (!input.trim() || chat.isPending || remaining === 0) && styles.sendDisabled, pressed && { transform: [{ scale: 0.94 }] }]}
          >
            <Ionicons name={chat.isPending ? 'hourglass-outline' : 'send'} size={20} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  bubbleRow: { flexDirection: 'row', marginBottom: spacing.md, alignItems: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  botIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  bubble: { maxWidth: '78%', paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.lg },
  bubbleUser: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleBot: { backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderBottomLeftRadius: 4 },
  suggestions: { paddingHorizontal: spacing.lg, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingBottom: spacing.md },
  suggestion: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 8, backgroundColor: colors.surface },
  composer: { flexDirection: 'row', alignItems: 'flex-end', padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  input: { flex: 1, maxHeight: 120, backgroundColor: colors.elevated, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, color: colors.text, fontSize: 15 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm },
  sendDisabled: { opacity: 0.5 },
});
