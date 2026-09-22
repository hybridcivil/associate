import React, { useState } from 'react';
import { AppDatabase, Session } from '../types';
import {
  Lock,
  User,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'motion/react';

interface LoginModalProps {
  db: AppDatabase;
  onLoginSuccess: (session: Session) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  db,
  onLoginSuccess,
}) => {
  const [usernameOrPhone, setUsernameOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const userClean = usernameOrPhone.trim();
    if (!userClean || !password) {
      setError('Please provide your Username or Phone number and Password.');
      return;
    }

    // 1. Check Admin
    if (
      userClean.toLowerCase() === (db.admin.username || 'admin').toLowerCase() &&
      password === (db.admin.password || 'admin123')
    ) {
      onLoginSuccess({
        role: 'admin',
        name: 'Administrator',
      });
      return;
    }

    // 2. Check Associate by Phone
    const associate = db.associates.find(
      (a) => a.phone === userClean && a.password === password
    );

    if (associate) {
      if (associate.status !== 'active') {
        setError('This associate account is currently marked inactive. Please contact the administrator.');
        return;
      }
      onLoginSuccess({
        role: 'associate',
        id: associate.id,
        name: associate.name,
        phone: associate.phone,
      });
      return;
    }

    setError('Invalid credentials or account inactive. Please check username/phone and password.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0d1f33]/90 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="bg-white rounded-2xl w-full max-w-sm sm:max-w-md shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-[#10243a] to-[#1c3b58] p-5 text-white relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f28c28] to-[#ffaa44] flex items-center justify-center text-[#10243a] font-black text-lg mb-2 shadow-lg shadow-orange-500/20">
            HC
          </div>
          <h2 className="text-lg font-bold tracking-tight">
            HYBRID CIVIL
          </h2>
          <p className="text-xs text-slate-300">
            Associate Network Portal · 90/5/5 Profit Allocation System
          </p>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Username / Associate Phone *
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  id="loginUserInput"
                  type="text"
                  required
                  autoFocus
                  value={usernameOrPhone}
                  onChange={(e) => setUsernameOrPhone(e.target.value)}
                  placeholder="Username or phone number"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  id="loginPasswordInput"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
                />
              </div>
            </div>

            <button
              id="submitLoginBtn"
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#f28c28] hover:bg-[#e07f20] text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 mt-2"
            >
              <span>Sign In to Network</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
