const React = require('react');
const { Text } = require('@react-email/components');
const EmailShell = require('./EmailShell');
const p = EmailShell.p;

const BookingConfirmedEmail = ({ clientName = 'Client', trainerName = 'Trainer', date = '', time = '', sessionType = 'Video Call', url = '#' }) =>
  React.createElement(
    EmailShell,
    { title: 'Session booked ✅', cta: { label: 'View In Calendar', url } },
    React.createElement(Text, { style: p }, `${clientName}, your ${sessionType} session with ${trainerName} is confirmed for ${date} at ${time}. Your trainer will receive pre-session notes beforehand.`),
  );

module.exports = BookingConfirmedEmail;
module.exports.subject = ({ trainerName }) => `Trainer session confirmed${trainerName ? ' with ' + trainerName : ''}`;
