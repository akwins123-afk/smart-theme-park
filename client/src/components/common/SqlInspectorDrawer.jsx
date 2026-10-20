import React, { useState } from 'react';
import { Terminal, ChevronUp, ChevronDown, Clock, CheckCircle2, XCircle, Trash2, Copy, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SqlInspectorDrawer({ sqlQueries = [], onClear }) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState('');

  const filteredQueries = sqlQueries.filter(q => {
    if (!filterText) return true;
    const lower = filterText.toLowerCase();
    return q.sql?.toLowerCase().includes(lower) || q.context?.toLowerCase().includes(lower);
  });

  const latestQuery = sqlQueries[0];

  return (
    <div className="fixed bottom-0 right-0 z-40 max-w-full sm:max-w-2xl w-full p-2 sm:p-4 pointer-events-none">
      <div className="pointer-events-auto">
        
        {/* Toggle Bar */}
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between px-4 py-2.5 bg-slate-900/95 border border-cyan-500/40 rounded-xl shadow-xl shadow-cyan-950/40 cursor-pointer backdrop-blur-md hover:border-cyan-400 transition-all"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
              <Terminal className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-100 flex items-center gap-1.5">
                  LIVE SQL INSPECTOR
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                  {sqlQueries.length} Executed
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 truncate max-w-xs sm:max-w-md">
                {latestQuery ? (
                  <span className="text-slate-300">
                    <span className="text-cyan-400">[{latestQuery.durationMs}ms]</span> {latestQuery.sql.substring(0, 60)}...
                  </span>
                ) : (
                  'Ready. Live queries stream here on every click.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Expanded Drawer */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: 10 }}
              animate={{ opacity: 1, height: '360px', y: 0 }}
              exit={{ opacity: 0, height: 0, y: 10 }}
              className="mt-2 bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-xl"
            >
              
              {/* Header Controls */}
              <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-900/60">
                <div className="relative flex-1">
                  <Filter className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Filter SQL by table or command (e.g. SELECT, INSERT, Virtual_Queue_Pass)..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 font-mono placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onClear}
                    title="Clear query stream"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-700 text-xs font-mono transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear
                  </button>
                </div>
              </div>

              {/* Queries Stream List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-800/40">
                {filteredQueries.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs font-mono">
                    No SQL queries recorded yet. Click any button in Customer or Admin view to watch queries run.
                  </div>
                ) : (
                  filteredQueries.map((item, idx) => (
                    <div key={idx} className="pt-2.5 first:pt-0">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                        <div className="flex items-center gap-2">
                          {item.success ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          )}
                          <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                            item.user === 'park_customer' 
                              ? 'bg-blue-950 text-blue-400 border border-blue-800' 
                              : 'bg-purple-950 text-purple-400 border border-purple-800'
                          }`}>
                            {item.user || 'admin'}
                          </span>
                          <span className="text-slate-500">{item.context || 'API'}</span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-400">
                          <span className="flex items-center gap-1 text-cyan-400 font-semibold">
                            <Clock className="w-3 h-3" />
                            {item.durationMs} ms
                          </span>
                          <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(item.sql);
                              alert('SQL copied!');
                            }}
                            title="Copy SQL"
                            className="text-slate-500 hover:text-cyan-400 transition-colors p-0.5"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                        {item.sql}
                      </div>

                      {item.params && item.params.length > 0 && (
                        <div className="mt-1 text-[10px] font-mono text-slate-400">
                          <span className="text-slate-500">Parameters: </span>
                          <code className="text-amber-300">{JSON.stringify(item.params)}</code>
                        </div>
                      )}

                      {item.errorMessage && (
                        <div className="mt-1 text-[11px] font-mono text-rose-400">
                          Error: {item.errorMessage}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
