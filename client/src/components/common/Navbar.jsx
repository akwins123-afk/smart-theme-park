import React from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  Radio, 
  LogOut, 
  User, 
  Compass, 
  Home,
  Cast
} from 'lucide-react';

export default function Navbar({ 
  currentView, 
  setCurrentView, 
  customerUser, 
  adminUser, 
  onLogoutCustomer, 
  onLogoutAdmin,
  sseConnected 
}) {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#001736] border-b border-sky-900/60 shadow-lg text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        
        {/* Brand / Logo (Disney World & Wonderla Style) */}
        <div 
          onClick={() => setCurrentView('landing')} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-600 p-0.5 shadow-md shadow-sky-500/30 group-hover:scale-105 transition-all">
            <div className="w-full h-full bg-[#001736] rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-sky-400 animate-sparkle" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-black text-xl tracking-tight text-white group-hover:text-sky-300 transition-colors">
                Smart Theme Park
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800">
                Resort DBMS
              </span>
            </div>
            <p className="text-[11px] text-sky-200/70 font-sans tracking-wide hidden sm:block">
              Disney & Wonderla Virtual Queue & RFID Wristband System
            </p>
          </div>
        </div>

        {/* Center / Navigation Bar */}
        <div className="hidden md:flex items-center gap-1 bg-[#002244] p-1.5 rounded-2xl border border-sky-900/80 text-xs">
          <button
            onClick={() => setCurrentView('landing')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
              currentView === 'landing'
                ? 'bg-sky-600 text-white font-bold shadow-md shadow-sky-900/40'
                : 'text-sky-100/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Home className="w-4 h-4" />
            Park Home
          </button>

          <button
            onClick={() => setCurrentView('customer')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
              currentView === 'customer'
                ? 'bg-sky-600 text-white font-bold shadow-md shadow-sky-900/40'
                : 'text-sky-100/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <User className="w-4 h-4" />
            Visitor Portal
          </button>

          <button
            onClick={() => setCurrentView('admin')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
              currentView === 'admin'
                ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950'
                : 'text-sky-100/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Park Staff / Admin
          </button>
        </div>

        {/* Right side: Live Sync & User Profile */}
        <div className="flex items-center gap-3">
          
          {/* Live Sync Badge */}
          <div 
            title={sseConnected ? "Server-Sent Events: Connected" : "Syncing live data..."}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono border ${
              sseConnected 
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80' 
                : 'bg-amber-950/80 text-amber-300 border-amber-700/80'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-bold">{sseConnected ? 'LIVE SYNC' : 'CONNECTING'}</span>
          </div>

          {/* Customer Logged In Pill */}
          {customerUser && (
            <div className="flex items-center gap-2 bg-[#002244] border border-sky-800/80 pl-3 pr-1.5 py-1 rounded-2xl text-xs">
              <div className="flex flex-col text-right">
                <span className="font-bold text-white leading-tight">
                  {customerUser.fullName}
                </span>
                <span className="text-[10px] font-mono text-sky-300">
                  {customerUser.bandUid} · ₹{customerUser.walletBalance?.toFixed(2)}
                </span>
              </div>
              <button
                onClick={onLogoutCustomer}
                title="Tap out / Sign Out"
                className="p-1.5 text-sky-300 hover:text-rose-400 hover:bg-white/10 rounded-xl transition-colors ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Admin Logged In Pill */}
          {currentView === 'admin' && adminUser && (
            <div className="flex items-center gap-2 bg-indigo-950/80 border border-indigo-700/80 pl-3 pr-1.5 py-1 rounded-2xl text-xs">
              <span className="font-mono text-indigo-300 font-bold hidden sm:inline">
                Park SuperAdmin
              </span>
              <button
                onClick={onLogoutAdmin}
                title="Admin Logout"
                className="p-1.5 text-indigo-300 hover:text-rose-400 hover:bg-white/10 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>

      </div>
    </header>
  );
}
