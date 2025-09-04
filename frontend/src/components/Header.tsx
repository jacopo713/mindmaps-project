"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { auth } from "../utils/firebase";

export default function Header() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  return (
    <div className="w-full border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-slate-800 no-underline">Tree</Link>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/chatbot" className="text-slate-600 hover:text-slate-900 no-underline">Chat</Link>
          <Link href="/mindmap" className="text-slate-600 hover:text-slate-900 no-underline">Mappe</Link>
          <div className="w-px h-4 bg-gray-300" />
          {!user ? (
            <>
              <Link href="/login" className="text-slate-700 hover:text-slate-900 no-underline">Login</Link>
              <Link href="/register" className="text-white bg-slate-900 hover:bg-black rounded px-3 py-1 no-underline">Registrati</Link>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-slate-700">{user.displayName || user.email}</span>
              <button onClick={() => signOut(auth)} className="text-slate-700 hover:text-slate-900">Logout</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


