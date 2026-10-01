const React = require('react');
const { Text } = require('@react-email/components');
const EmailShell = require('./EmailShell');
const p = EmailShell.p;

const ReceiptEmail = ({ itemName = 'Purchase', amount = '0.00', currency = 'USD', date = '', invoiceUrl = '#' }) =>
  React.createElement(
    EmailShell,
    { title: 'Payment received 🧾', cta: { label: 'View Invoice', url: invoiceUrl } },
    React.createElement(Text, { style: p }, `Payment of ${amount} ${currency.toUpperCase()} for "${itemName}" on ${date} was successful. Thank you!`),
  );

module.exports = ReceiptEmail;
module.exports.subject = ({ itemName }) => `Receipt: ${itemName || 'your purchase'}`;
