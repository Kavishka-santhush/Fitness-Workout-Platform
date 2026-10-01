const React = require('react');
const { Text } = require('@react-email/components');
const EmailShell = require('./EmailShell');
const p = EmailShell.p;

const WeeklyReportEmail = ({ name = 'Athlete', workouts = 0, calories = 0, streak = 0, avgProtein = 0, summary = '', url = '#' }) =>
  React.createElement(
    EmailShell,
    { title: `Your week in review, ${name} 📊`, cta: { label: 'Open Full Report', url } },
    React.createElement(
      Text,
      { style: p },
      `Workouts: ${workouts} · Calories burned: ${calories} · Current streak: ${streak} days · Avg protein/day: ${avgProtein}g. ${summary}`,
    ),
  );

module.exports = WeeklyReportEmail;
module.exports.subject = () => '📈 Your weekly fitness report is ready';
