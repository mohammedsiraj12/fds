import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Care Connect",
  description: "Ask doctors, book appointments, and manage records",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <header className="container" style={{ paddingTop: 24 }}>
          <div className="header">
            <div className="brand">
              <span style={{ fontSize: 22 }}>🩺</span>
              <span>Care Connect</span>
            </div>
            <nav className="nav">
              <Link href="/">
                <button className="btn btn-secondary">Home</button>
              </Link>
              <Link href="/patient/login">
                <button className="btn btn-primary">Patient</button>
              </Link>
              <Link href="/doctor/login">
                <button className="btn btn-primary">Doctor</button>
              </Link>
              <Link href="/admin">
                <button className="btn btn-secondary">Admin</button>
              </Link>
            </nav>
          </div>
        </header>
        <main className="container" style={{ paddingTop: 24 }}>
          {children}
        </main>
      </body>
    </html>
  );
}
