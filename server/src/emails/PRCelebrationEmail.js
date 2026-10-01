const React = require('react');
const { Text } = require('@react-email/components');
const EmailShell = require('./EmailShell');
const p = EmailShell.p;

const PRCelebrationEmail = ({ name = 'Athlete', exerciseName = 'Bench Press', detail = 'new best', url = '#' }) =>
  React.createElement(
    EmailShell,
    { title: `🎉 New PR, ${name}!`, cta: { label: 'See It In Your Log', url } },
    React.createElement(Text, { style: p }, `You set a new personal record on ${exerciseName}: ${detail}. Share it to your feed and collect some kudos!`),
  );

module.exports = PRCelebrationEmail;
module.exports.subject = ({ exerciseName }) => `🏆 New PR: ${exerciseName || 'Personal Record'}`;
