const React = require('react');
const { Text } = require('@react-email/components');
const EmailShell = require('./EmailShell');
const p = EmailShell.p;

const TrainerApplicationEmail = ({ name = 'Trainer', specialization = '', reviewUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/admin/trainers` }) =>
  React.createElement(
    EmailShell,
    { title: 'New trainer application 🧑‍🏫', cta: { label: 'Review Application', url: reviewUrl } },
    React.createElement(Text, { style: p }, `${name} (specialization: ${specialization || 'general'}) applied to become a verified trainer. Review certifications and approve or reject.`),
  );

module.exports = TrainerApplicationEmail;
module.exports.subject = ({ name }) => `Trainer application: ${name || 'new applicant'}`;
