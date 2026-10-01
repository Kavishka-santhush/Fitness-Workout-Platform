const React = require('react');
const { Text } = require('@react-email/components');
const EmailShell = require('./EmailShell');
const p = EmailShell.p;

const LiveClassReminderEmail = ({ name = 'Athlete', className = 'Live Class', startsIn = '1 hour', trainerName = '', url = '#' }) =>
  React.createElement(
    EmailShell,
    { title: `${className} starts ${startsIn} 🔴`, cta: { label: 'Join The Class', url } },
    React.createElement(Text, { style: p }, `Hey ${name} — ${trainerName ? trainerName + ' is leading ' : ''}${className} in ${startsIn}. Grab your mat/dumbbells and don't be late.`),
  );

module.exports = LiveClassReminderEmail;
module.exports.subject = ({ className }) => `Live class ${className || 'your class'} starts soon`;
