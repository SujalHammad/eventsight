import React from "react";
import TopNav from "./TopNav";

export default function AppShell({ children, user }) {
  return (
    <div className="app-shell">
      <TopNav user={user} />
      <main className="shell-wrap">{children}</main>
    </div>
  );
}
