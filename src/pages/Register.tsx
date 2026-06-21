import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Register submitted:', { name, email, password, confirmPassword });
    // TODO: Implement Firebase Auth logic in next phase
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#121212] w-full px-6 py-8">
      {/* Top Section */}
      <div className="flex flex-col items-center justify-center pt-4 pb-8">
        <img src="/Logo.png" alt="VChat Logo" className="w-16 h-16 object-contain mb-4" />
        <h2 className="text-xl font-semibold text-white text-center">Create your VChat account</h2>
      </div>

      {/* Form Section */}
      <div className="flex-1 flex flex-col w-full max-w-sm mx-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300 ml-1" htmlFor="name">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <User size={20} />
              </div>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="w-full bg-[#1e1e1e] border-none text-white text-base rounded-lg focus:ring-2 focus:ring-indigo-500 block pl-10 p-3.5 placeholder-slate-500"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

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
                className="w-full bg-[#1e1e1e] border-none text-white text-base rounded-lg focus:ring-2 focus:ring-indigo-500 block pl-10 p-3.5 placeholder-slate-500"
                placeholder="name@example.com"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300 ml-1" htmlFor="password">Password</label>
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
                className="w-full bg-[#1e1e1e] border-none text-white text-base rounded-lg focus:ring-2 focus:ring-indigo-500 block pl-10 pr-10 p-3.5 placeholder-slate-500"
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
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300 ml-1" htmlFor="confirmPassword">Confirm Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Lock size={20} />
              </div>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="w-full bg-[#1e1e1e] border-none text-white text-base rounded-lg focus:ring-2 focus:ring-indigo-500 block pl-10 pr-10 p-3.5 placeholder-slate-500"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-6 w-full text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/50 font-medium rounded-lg text-base px-5 py-3.5 text-center flex items-center justify-center gap-2 transition-colors disabled:opacity-70 uppercase"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'REGISTER'}
          </button>
        </form>

        <p className="text-sm text-center text-slate-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300">
            Login
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
