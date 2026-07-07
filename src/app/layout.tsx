import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: '--font-jakarta' });

export const metadata: Metadata = {
  title: "Clearhead App",
  description: "Clearhead App built with Next.js",
  icons: {
    icon: [
      { url: '/clearhead-app-icon.svg', type: 'image/svg+xml' }
    ],
    apple: [
      { url: '/clearhead-app-icon.svg' }
    ]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jakarta.variable}`}>
      <body>
        <div className="relative z-10 h-full">
          {children}
        </div>
      </body>
    </html>
  );
}
