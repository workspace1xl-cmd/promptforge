import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "PromptForge — reviewed, ship-ready coding prompts",
  description:
    "Upload an SOP or client brief, run a four-agent requirement review, and generate a phased production-ready prompt for your coding agent.",
};

// Set the theme before paint to avoid a flash of the wrong colour scheme.
const themeInit = `(function(){try{var t=localStorage.getItem('pf-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme:dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
