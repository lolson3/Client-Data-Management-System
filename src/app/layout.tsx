import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata: Metadata = {
  title: "Client Data Management System",
  description: "IT infrastructure data management for multiple clients",
};

// Script to prevent flash of wrong theme on page load
const themeInitScript = `
(function() {
  var t = localStorage.getItem('theme');
  var d = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (t === 'dark' || (t === 'system' && d) || (!t && d)) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
