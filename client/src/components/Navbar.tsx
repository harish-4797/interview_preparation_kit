'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/authContext';
import { Sparkles, LogOut, BookOpen, PlusCircle, User as UserIcon } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 text-white font-bold text-lg tracking-tight">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span>Trao<span className="text-indigo-400">Prep</span></span>
          </Link>

          {user && (
            <div className="hidden md:flex items-center gap-1">
              <Link
                href="/"
                className="px-3 py-1.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800/60 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <BookOpen className="h-4 w-4 text-zinc-400" />
                My Kits
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/new"
                className="px-3.5 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-500/30 flex items-center gap-1.5 transition-all"
              >
                <PlusCircle className="h-4 w-4" />
                <span>New Kit</span>
              </Link>

              <div className="h-5 w-px bg-zinc-800 mx-1 hidden sm:block" />

              <div className="flex items-center gap-2 text-sm text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
                <UserIcon className="h-3.5 w-3.5 text-zinc-500" />
                <span className="hidden sm:inline text-zinc-300 font-medium">{user.name || user.email.split('@')[0]}</span>
              </div>

              <button
                onClick={logout}
                title="Log Out"
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-sm text-zinc-300 hover:text-white rounded-lg transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
