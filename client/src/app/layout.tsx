import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../lib/authContext';
import Navbar from '../components/Navbar';

export const metadata: Metadata = {
  title: 'Trao AI Interview Prep Kit',
  description: 'Turn any job description and company website into a personalized, verified interview preparation kit with flashcard practice and study schedules.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-500">
            Trao AI Interview Prep Kit • Technical Assessment Submission
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
