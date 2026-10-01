const React = require('react');
const { Text } = require('@react-email/components');
const EmailShell = require('./EmailShell');
const p = EmailShell.p;

const StreakAtRiskEmail = ({ name = 'Athlete', streak = 0, url = '#' }) =>
  React.createElement(
    EmailShell,
    { title: `${name}, your ${streak}-day streak is at risk 🔥`, cta: { label: 'Save Your Streak', url } },
    React.createElement(Text, { style: p }, `You haven't logged a workout today. One quick session keeps your ${streak}-day streak alive — Premium members can also use a Streak Freeze.`),
  );

module.exports = StreakAtRiskEmail;
module.exports.subject = ({ streak }) => `⚠️ ${streak}-day streak at risk`;
