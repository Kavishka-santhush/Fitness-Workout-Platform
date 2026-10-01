// Achievement badges — criteria JSONB evaluated by achievement.service.
// { metric, op, value } — metric maps to a computed user stat.
function A(key, name, description, category, metric, op, value, xp, rarity) {
  return {
    key, name, description, category,
    criteria: { metric, op, value },
    xpReward: xp,
    rarity: rarity || 'COMMON',
    iconUrl: `/badges/${key.toLowerCase()}.svg`,
  };
}

module.exports = {
  achievements: [
    A('FIRST_WORKOUT', 'First Workout', 'Completed your first workout session', 'WORKOUT', 'workoutsCompleted', '>=', 1, 100, 'COMMON'),
    A('WORKOUTS_10', '10 Workouts', 'Completed 10 workout sessions', 'WORKOUT', 'workoutsCompleted', '>=', 10, 150, 'COMMON'),
    A('WORKOUTS_50', '50 Workouts', 'Completed 50 workout sessions', 'WORKOUT', 'workoutsCompleted', '>=', 50, 400, 'RARE'),
    A('WORKOUTS_100', 'Century Club', 'Completed 100 workout sessions', 'WORKOUT', 'workoutsCompleted', '>=', 100, 1000, 'EPIC'),
    A('STREAK_7', 'Week Warrior', '7-day workout streak', 'STREAK', 'streakLongest', '>=', 7, 200, 'RARE'),
    A('STREAK_30', 'Month of Discipline', '30-day workout streak', 'STREAK', 'streakLongest', '>=', 30, 600, 'EPIC'),
    A('STREAK_100', 'Unbreakable', '100-day workout streak', 'STREAK', 'streakLongest', '>=', 100, 2000, 'LEGENDARY'),
    A('PR_FIRST', 'First PR', 'Set your first personal record', 'PR', 'prCount', '>=', 1, 150, 'COMMON'),
    A('PR_10', 'Pr Chaser', 'Set 10 personal records', 'PR', 'prCount', '>=', 10, 400, 'RARE'),
    A('PR_50', 'Record Breaker', 'Set 50 personal records', 'PR', 'prCount', '>=', 50, 900, 'EPIC'),
    A('LIFT_100KG', '100kg Lifted', 'Total volume of 100kg lifted', 'LIFT', 'totalVolumeKg', '>=', 100, 120, 'COMMON'),
    A('LIFT_1000KG', '1000kg Lifted', 'Total volume of 1,000kg lifted', 'LIFT', 'totalVolumeKg', '>=', 1000, 350, 'RARE'),
    A('LIFT_10000KG', '10 Tonne Club', 'Total volume of 10,000kg lifted', 'LIFT', 'totalVolumeKg', '>=', 10000, 1200, 'EPIC'),
    A('RUN_FIRST', 'First Run', 'Logged your first cardio session', 'CARDIO', 'cardioCount', '>=', 1, 100, 'COMMON'),
    A('RUN_5K', '5K Done', 'Completed a 5km run', 'CARDIO', 'longestRunM', '>=', 5000, 250, 'RARE'),
    A('RUN_10K', '10K Crusher', 'Completed a 10km run', 'CARDIO', 'longestRunM', '>=', 10000, 500, 'EPIC'),
    A('RUN_HM', 'Half Marathoner', 'Completed a 21.1km run', 'CARDIO', 'longestRunM', '>=', 21100, 1000, 'EPIC'),
    A('RUN_MARATHON', 'Marathoner', 'Completed a 42.2km run', 'CARDIO', 'longestRunM', '>=', 42200, 2500, 'LEGENDARY'),
    A('CLASS_FIRST', 'First Live Class', 'Attended your first live class', 'CLASS', 'classesAttended', '>=', 1, 120, 'COMMON'),
    A('CLASS_10', 'Class Regular', 'Attended 10 live classes', 'CLASS', 'classesAttended', '>=', 10, 400, 'RARE'),
    A('NUTRITION_30', '30-Day Nutrition Streak', 'Logged meals for 30 consecutive days', 'NUTRITION', 'nutritionStreak', '>=', 30, 500, 'EPIC'),
    A('PROGRAM_FIRST', 'First Program', 'Completed your first training program', 'PROGRAM', 'programsCompleted', '>=', 1, 300, 'RARE'),
    A('PROGRAM_5', 'Program Pro', 'Completed 5 training programs', 'PROGRAM', 'programsCompleted', '>=', 5, 900, 'EPIC'),
    A('WEIGHT_GOAL', 'Weight Goal Reached', 'Reached your target weight', 'GOAL', 'weightGoalReached', '>=', 1, 400, 'RARE'),
    A('MEASUREMENT_GOAL', 'Measurement Goal Reached', 'Reached a body measurement goal', 'GOAL', 'measurementGoalReached', '>=', 1, 400, 'RARE'),
    A('CHALLENGE_FIRST', 'First Challenge', 'Completed your first challenge', 'CHALLENGE', 'challengesCompleted', '>=', 1, 250, 'RARE'),
    A('CHALLENGE_10', 'Competitor', 'Completed 10 challenges', 'CHALLENGE', 'challengesCompleted', '>=', 10, 800, 'EPIC'),
    A('FOLLOWERS_100', 'Century Community', 'Gained 100 followers', 'COMMUNITY', 'followers', '>=', 100, 300, 'RARE'),
    A('KUDOS_FIRST', 'First Kudos', 'Received your first kudos', 'COMMUNITY', 'kudosReceived', '>=', 1, 50, 'COMMON'),
    A('POSTS_50', 'Content Creator', 'Shared 50 posts to the feed', 'COMMUNITY', 'posts', '>=', 50, 350, 'RARE'),
  ],
};
