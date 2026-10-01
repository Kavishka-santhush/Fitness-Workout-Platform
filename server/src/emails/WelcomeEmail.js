const React = require('react');
const { Text } = require('@react-email/components');
const EmailShell = require('./EmailShell');
const p = EmailShell.p;

const WelcomeEmail = ({ name = 'Athlete', goal = 'fitness', dashboardUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard` }) =>
  React.createElement(
    EmailShell,
    { title: `Welcome aboard, ${name}! 🎉`, cta: { label: 'Go To Dashboard', url: dashboardUrl } },
    React.createElement(
      Text,
      { style: p },
      `Your account is ready. Set your goal (${goal}), explore 1000+ exercises, generate an AI workout plan, and start logging. The community is already training — catch up!`,
    ),
  );

module.exports = WelcomeEmail;
module.exports.subject = ({ name }) => `Welcome to the platform, ${name || 'athlete'}!`;
