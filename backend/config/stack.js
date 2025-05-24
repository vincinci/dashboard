const { StackServerApp } = require('@stackframe/stack');

const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie", // Use nextjs-cookie for backend
  projectId: '152e4784-bdba-4155-a6c2-75dca4058e26',
  publishableClientKey: 'pck_dk61bp0kgdr7a6hy9v3sbxawptfn5nntpvsxsfcqnahjr',
  secretServerKey: process.env.STACK_SECRET_SERVER_KEY || 'ssk_tb857g2g2sg3qdacbz45dqx8p2gw8bgjxt0f7bew0t9s8'
});

module.exports = { stackServerApp }; 