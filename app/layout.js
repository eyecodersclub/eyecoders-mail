import "./globals.css";

export const metadata = {
  title: "EyeCoders Mail — Admin Portal",
  description:
    "A premium email sending portal powered by Google Apps Script. Send beautifully crafted emails to multiple recipients with HTML support.",
  keywords: ["email", "mail", "portal", "admin", "apps script"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
