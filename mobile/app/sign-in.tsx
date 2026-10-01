import React, { useState } from 'react';
import { StyleSheet, View, Pressable, Linking } from 'react-native';
import { router } from 'expo-router';
import { useOAuth, useSignIn } from '@clerk/clerk-expo';
import { Text } from '@/components/ui/Text';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, radius, spacing } from '@/lib/theme';

/**
 * Clerk-powered sign-in. OAuth (Google / Apple) opens the system browser and
 * hands back a created session; email sends a one-time code. Either path calls
 * `setActive` so Clerk's token becomes available to the axios interceptor.
 */
export default function SignIn() {
  const { startOAuthFlow: google } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: apple } = useOAuth({ strategy: 'oauth_apple' });
  const { signIn } = useSignIn();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'idle' | 'code'>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runOAuth(start: typeof google) {
    setBusy(true);
    setError(null);
    try {
      const { createdSessionId, setActive, signInUrl } = await start();
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace('/(tabs)');
      } else if (signInUrl) {
        await Linking.openURL(signInUrl);
      }
    } catch (e: any) {
      setError(e?.errors?.[0]?.longMessage ?? e?.message ?? 'OAuth failed');
    } finally {
      setBusy(false);
    }
  }

  async function sendCode() {
    setBusy(true);
    setError(null);
    try {
      await signIn?.createEmailCodeSession({ emailAddress: email });
      setStage('code');
    } catch (e: any) {
      setError(e?.errors?.[0]?.longMessage ?? 'Could not send code');
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    setBusy(true);
    setError(null);
    try {
      const res = await signIn?.attemptFirstFactor({ strategy: 'email_code', code });
      if (res?.status === 'complete') {
        await signIn?.setActive({ session: res.createdSessionId });
        router.replace('/(tabs)');
      } else {
        setError('Verification incomplete');
      }
    } catch (e: any) {
      setError(e?.errors?.[0]?.longMessage ?? 'Invalid code');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll keyboard>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Text variant="h1" color="primary">
            FitForge
          </Text>
        </View>
        <Text variant="h2" center>
          Train smarter.
        </Text>
        <Text variant="muted" center style={{ marginTop: 6 }}>
          Workouts, nutrition, coaching and community — in your pocket.
        </Text>
      </View>

      {error ? (
        <Text variant="caption" color="danger" style={{ marginBottom: spacing.md, textAlign: 'center' }}>
          {error}
        </Text>
      ) : null}

      <Button
        label="Continue with Google"
        icon="logo-google"
        variant="secondary"
        fullWidth
        loading={busy}
        onPress={() => runOAuth(google)}
        style={{ marginBottom: spacing.sm }}
      />
      <Button
        label="Continue with Apple"
        icon="logo-apple"
        variant="secondary"
        fullWidth
        loading={busy}
        onPress={() => runOAuth(apple)}
        style={{ marginBottom: spacing.lg }}
      />

      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Text variant="caption">or use email</Text>
        <View style={styles.line} />
      </View>

      {stage === 'idle' ? (
        <>
          <Input
            label="Email"
            icon="mail-outline"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
          />
          <Button label="Send code" onPress={sendCode} loading={busy} disabled={!email.includes('@')} fullWidth />
        </>
      ) : (
        <>
          <Input
            label="Verification code"
            icon="key-outline"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
            placeholder="6-digit code"
            hint={`Sent to ${email}`}
          />
          <Button label="Verify" onPress={verifyCode} loading={busy} disabled={code.length < 4} fullWidth />
          <Pressable onPress={() => setStage('idle')} style={{ marginTop: spacing.md, alignItems: 'center' }}>
            <Text variant="label" color="muted">
              Use a different email
            </Text>
          </Pressable>
        </>
      )}

      <Pressable onPress={() => router.push('/onboarding')} style={{ marginTop: spacing.xl, alignItems: 'center' }}>
        <Text variant="muted">
          New here? We'll set up your profile after sign-in.
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xl },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg, gap: spacing.md },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
