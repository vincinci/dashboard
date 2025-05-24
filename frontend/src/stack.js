import { StackClientApp } from "@stackframe/react";

export const stackClientApp = new StackClientApp({
  projectId: process.env.REACT_APP_STACK_PROJECT_ID || "152e4784-bdba-4155-a6c2-75dca4058e26",
  publishableClientKey: process.env.REACT_APP_STACK_PUBLISHABLE_CLIENT_KEY || "pck_dk61bp0kgdr7a6hy9v3sbxawptfn5nntpvsxsfcqnahjr",
  tokenStore: "cookie"
}); 