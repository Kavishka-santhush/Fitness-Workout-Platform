/** Shared layout wrapper for all React Email templates. */
const React = require('react');
const { Html, Head, Body, Container, Heading, Text, Link } = require('@react-email/components');

const EmailShell = ({ preheader, title, children, cta = null }) =>
  React.createElement(
    Html,
    null,
    React.createElement(Head, null),
    React.createElement(
      Body,
      { style: { backgroundColor: '#0f172a', color: '#e2e8f0', fontFamily: 'Inter, Arial, sans-serif', margin: 0, padding: '24px 0' } },
      React.createElement(
        Container,
        { style: { maxWidth: '560px', margin: '0 auto', backgroundColor: '#1e293b', borderRadius: '16px', padding: '32px' } },
        React.createElement(
          Text,
          { style: { fontSize: '12px', color: '#94a3b8', margin: '0 0 16px' } },
          'FITNESS & WORKOUT PLATFORM',
        ),
        React.createElement(Heading, { style: { fontSize: '24px', margin: '0 0 12px', color: '#f8fafc' } }, title),
        children,
        cta
          ? React.createElement(
              Link,
              { href: cta.url, style: { display: 'inline-block', backgroundColor: '#22c55e', color: '#0f172a', fontWeight: '700', borderRadius: '10px', padding: '12px 24px', textDecoration: 'none', marginTop: '16px' } },
              cta.label,
            )
          : null,
        React.createElement('hr', { style: { border: 'none', borderTop: '1px solid #334155', marginTop: '24px' } }),
        React.createElement(Text, { style: { fontSize: '12px', color: '#64748b' } }, preheader || 'You are receiving this because you have a Fitness & Workout Platform account.'),
      ),
    ),
  );

module.exports = EmailShell;
module.exports.p = { fontSize: '15px', lineHeight: '24px', color: '#cbd5e1' };
