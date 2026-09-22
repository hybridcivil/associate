import React, { useState } from 'react';
import { AppDatabase, Session } from '../types';
import {
  Lock,
  User,
  ShieldCheck,
  Building2,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Smartphone,
  CheckCircle,
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

  const handleQuickDemo = (type: 'admin' | 'assoc1' | 'assoc2') => {
    if (type === 'admin') {
      setUsernameOrPhone('admin');
      setPassword('admin123');
    } else if (type === 'assoc1') {
      setUsernameOrPhone('01711000111');
      setPassword('assoc123');
    } else if (type === 'assoc2') {
      setUsernameOrPhone('01822000222');
      setPassword('assoc123');
    }
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
                  placeholder="admin or associate phone number"
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

          {/* Quick Fill Demo Access Chips */}
          <div className="pt-3 border-t border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
              Instant Demo Access:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                id="demoAdminBtn"
                onClick={() => handleQuickDemo('admin')}
                className="text-[10.5px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3 h-3 text-orange-500" />
                <span>Admin (admin / admin123)</span>
              </button>
              <button
                type="button"
                id="demoAssoc1Btn"
                onClick={() => handleQuickDemo('assoc1')}
                className="text-[10.5px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Smartphone className="w-3 h-3 text-blue-500" />
                <span>Associate (Tanvir)</span>
              </button>
              <button
                type="button"
                id="demoAssoc2Btn"
                onClick={() => handleQuickDemo('assoc2')}
                className="text-[10.5px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Smartphone className="w-3 h-3 text-emerald-500" />
                <span>Associate (Nadia)</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
