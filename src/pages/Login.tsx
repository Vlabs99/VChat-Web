import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/user-disabled') {
        setError('This account has been disabled.');
      } else {
        setError('An error occurred during login. Please try again.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#121212] w-full px-6 py-8">
      {/* Top Section */}
      <div className="flex flex-col items-center justify-center pt-8 pb-10">
        <img src="/Logo.png" alt="VChat Logo" className="w-24 h-24 object-contain mb-4" />
        <h1 className="text-3xl font-bold text-white tracking-wide">VChat</h1>
      </div>

      {/* Form Section */}
      <div className="flex-1 flex flex-col w-full max-w-sm mx-auto">
        {error && (
          <div className="mb-6 p-3 rounded bg-red-500/10 border border-red-500/20 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-400 leading-snug">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300 ml-1" htmlFor="email">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Mail size={20} />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full bg-[#1e1e1e] border-none text-white text-base rounded-lg focus:ring-2 focus:ring-indigo-500 block pl-10 p-3.5 placeholder-slate-500 disabled:opacity-50"
                placeholder="name@example.com"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center ml-1">
              <label className="text-sm font-medium text-slate-300" htmlFor="password">Password</label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Lock size={20} />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full bg-[#1e1e1e] border-none text-white text-base rounded-lg focus:ring-2 focus:ring-indigo-500 block pl-10 pr-10 p-3.5 placeholder-slate-500 disabled:opacity-50"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <div className="flex justify-end mt-1">
              <a href="#" className="text-sm text-indigo-400 hover:text-indigo-300">Forgot password?</a>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-6 w-full text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/50 font-medium rounded-lg text-base px-5 py-3.5 text-center flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed uppercase"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'LOGIN'}
          </button>
        </form>

        <p className="text-sm text-center text-slate-400 mt-8">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-indigo-400 hover:text-indigo-300">
            Register
          </Link>
        </p>
      </div>

      {/* Footer Section */}
      <div className="pt-8 pb-4 flex flex-col items-center">
        <span className="text-slate-400 text-sm mb-1">from</span>
        <span className="text-white text-lg font-medium tracking-wide">Vishvarajsinh</span>
      </div>
    </div>
  );
};
