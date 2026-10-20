import React from 'react';
import { AlertTriangle, ShieldAlert, X, Info, Database, CheckCircle, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RuleBlockedModal({ errorData, onClose }) {
  if (!errorData) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(errorData, null, 2));
    alert('Database diagnostic error copied to clipboard!');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        
        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-xl bg-white border-2 border-rose-400 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Top glowing bar */}
          <div className="h-2 w-full bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600" />

          <div className="p-6 sm:p-7">
            
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600">
                  <ShieldAlert className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-rose-600 font-bold">
                    Database Integrity Assertion
                  </span>
                  <h3 className="text-xl font-extrabold text-[#002244] leading-snug">
                    {errorData.title || 'Database Constraint Violation'}
                  </h3>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Human Friendly Explanation */}
            <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-slate-800 text-sm leading-relaxed">
              <p className="font-semibold text-rose-900">
                {errorData.explanation || errorData.rawMessage}
              </p>
            </div>

            {/* "Which Rule Blocked This?" Diagnostic Breakdown */}
            <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Info className="w-4 h-4 text-[#0072ce]" />
                <span>Which relational rule blocked this operation?</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
                
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Business Rule</span>
                  <span className="text-amber-700 font-bold">
                    {errorData.violatedRule || 'Integrity Guard'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Enforced By</span>
                  <span className="text-[#0072ce] font-bold">
                    {errorData.enforcedBy || 'MySQL Engine'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">SQLSTATE Code</span>
                  <span className="text-purple-700 font-bold">
                    {errorData.sqlState || '45000'} (Errno {errorData.errno || '1644'})
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Enforcement Point</span>
                  <span className="text-emerald-700 font-bold">
                    DBMS Server-Side Trigger
                  </span>
                </div>

              </div>

              {/* Raw MySQL Signal */}
              {errorData.rawMessage && (
                <div className="mt-2 p-2.5 rounded-xl bg-white border border-slate-200 text-[11px] font-mono text-slate-700">
                  <span className="text-slate-400 text-[10px] block font-bold">Raw MySQL Signal:</span>
                  <code className="text-rose-700 font-bold">"{errorData.rawMessage}"</code>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono text-slate-500 hover:text-[#0072ce] hover:bg-slate-100 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Diagnostic Details
              </button>

              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-200 transition-all hover:scale-105"
              >
                Understood & Close
              </button>
            </div>

          </div>
        </motion.div>

      </div>
    </AnimatePresence>
  );
}
