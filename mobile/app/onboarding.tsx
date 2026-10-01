import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/ui/Card';
import { spacing } from '@/lib/theme';
import { useCompleteOnboarding } from '@/hooks/queries';
import { useSettings, type Units } from '@/store/settings';

const GOALS = ['WEIGHT_LOSS', 'MUSCLE_GAIN', 'ENDURANCE', 'FLEXIBILITY', 'GENERAL_FITNESS', 'ATHLETIC_PERFORMANCE'];
const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ATHLETE'];
const ACTIVITY = ['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE'];
const SEXES: [string, string][] = [['MALE', 'Male'], ['FEMALE', 'Female'], ['OTHER', 'Other']];

function label(s: string) {
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Onboarding() {
  const { user } = useUser();
  const setUnitsPref = useSettings((s) => s.setUnits);
  const onboarding = useCompleteOnboarding();

  const [name, setName] = useState(user?.fullName ?? '');
  const [goal, setGoal] = useState('GENERAL_FITNESS');
  const [level, setLevel] = useState('BEGINNER');
  const [activity, setActivity] = useState('MODERATE');
  const [sex, setSex] = useState('MALE');
  const [units, setUnits] = useState<Units>('metric');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [days, setDays] = useState('4');

  function finish() {
    onboarding.mutate(
      {
        displayName: name || undefined,
        goal,
        experienceLevel: level,
        activityLevel: activity,
        sex,
        units: units.toUpperCase(),
        heightCm: height ? Number(height) : undefined,
        weightKg: weight ? Number(weight) : undefined,
        workoutDaysWeek: Number(days) || 3,
        preferredTypes: [],
        equipment: [],
        injuries: [],
      },
      {
        onSuccess: () => {
          setUnitsPref(units);
          router.replace('/(tabs)');
        },
      }
    );
  }

  return (
    <Screen keyboard>
      <Text variant="h1" style={{ marginTop: spacing.lg }}>
        Let's build your plan
      </Text>
      <Text variant="muted" style={{ marginBottom: spacing.lg }}>
        A few details so workouts and nutrition fit you from day one.
      </Text>

      <Input label="Display name" value={name} onChangeText={setName} placeholder="Your name" />

      <SectionHeader title="Primary goal" />
      <View style={styles.chips}>
        {GOALS.map((g) => (
          <Chip key={g} label={label(g)} selected={goal === g} onPress={() => setGoal(g)} />
        ))}
      </View>

      <SectionHeader title="Experience level" />
      <View style={styles.chips}>
        {LEVELS.map((l) => (
          <Chip key={l} label={label(l)} selected={level === l} onPress={() => setLevel(l)} />
        ))}
      </View>

      <SectionHeader title="Activity level" />
      <View style={styles.chips}>
        {ACTIVITY.map((a) => (
          <Chip key={a} label={label(a)} selected={activity === a} onPress={() => setActivity(a)} />
        ))}
      </View>

      <SectionHeader title="Biometrics" />
      <View style={styles.chips}>
        {SEXES.map(([v, l]) => (
          <Chip key={v} label={l} selected={sex === v} onPress={() => setSex(v)} />
        ))}
        <Chip label="Metric" selected={units === 'metric'} onPress={() => setUnits('metric')} />
        <Chip label="Imperial" selected={units === 'imperial'} onPress={() => setUnits('imperial')} />
      </View>
      <View style={styles.row}>
        <Input
          label={units === 'metric' ? 'Height (cm)' : 'Height (in)'}
          keyboardType="number-pad"
          value={height}
          onChangeText={setHeight}
          containerStyle={{ flex: 1, marginRight: spacing.md }}
        />
        <Input
          label={units === 'metric' ? 'Weight (kg)' : 'Weight (lb)'}
          keyboardType="number-pad"
          value={weight}
          onChangeText={setWeight}
          containerStyle={{ flex: 1 }}
        />
      </View>
      <Input label="Workout days / week" keyboardType="number-pad" value={days} onChangeText={setDays} />

      <Button
        label="Finish setup"
        icon="checkmark"
        fullWidth
        loading={onboarding.isPending}
        onPress={finish}
        style={{ marginTop: spacing.lg, marginBottom: spacing['2xl'] }}
      />
      {onboarding.isError ? (
        <Text variant="caption" color="danger" center>
          {(onboarding.error as Error)?.message ?? 'Could not save — try again.'}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
  row: { flexDirection: 'row' },
});
