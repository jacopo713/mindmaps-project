"use client";
import Link from 'next/link';
import { useState } from 'react';
import { auth } from '../../../utils/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-slate-800">
      <div className="w-full max-w-sm border border-gray-200 rounded-xl p-6">
        <h1 className="text-xl font-semibold mb-4">Accedi</h1>
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setLoading(true);
          try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push('/mindmap');
          } catch (err: any) {
            setError(err.message || 'Errore nell\'accesso');
          } finally {
            setLoading(false);
          }
        }}>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading} className="w-full mt-2 px-4 py-2 rounded bg-slate-900 hover:bg-black text-white text-sm font-medium disabled:opacity-60">{loading ? 'Accesso...' : 'Entra'}</button>
        </form>
        {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
        <div className="text-sm text-slate-600 mt-3">
          Non hai un account? <Link href="/register" className="text-slate-900 underline">Registrati</Link>
        </div>
      </div>
    </div>
  );
}


