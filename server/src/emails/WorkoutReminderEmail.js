const React = require('react');
const { Text } = require('@react-email/components');
const EmailShell = require('./EmailShell');
const p = EmailShell.p;

const WorkoutReminderEmail = ({ name = 'Athlete', workoutName = 'Today\'s Workout', time = 'now', url = '#' }) =>
  React.createElement(
    EmailShell,
    { title: `Time to train, ${name}! 💪`, cta: { label: 'Start Workout', url } },
    React.createElement(Text, { style: p }, `Your scheduled workout "${workoutName}" is at ${time}. Lace up — your streak is waiting.`),
  );

module.exports = WorkoutReminderEmail;
module.exports.subject = ({ workoutName }) => `Workout reminder: ${workoutName || 'today\'s session'}`;
