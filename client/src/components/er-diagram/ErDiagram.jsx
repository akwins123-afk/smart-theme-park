import React, { useMemo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  Handle, 
  Position 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Key, Link, ShieldAlert, CheckCircle2 } from 'lucide-react';

// Custom Entity Node Component
function TableNode({ data }) {
  return (
    <div 
      onClick={() => data.onSelectTable && data.onSelectTable(data.label)}
      className="w-64 rounded-2xl bg-slate-900 border-2 border-slate-700/80 shadow-2xl overflow-hidden hover:border-cyan-400 cursor-pointer transition-all hover:scale-105"
    >
      <Handle type="target" position={Position.Top} className="!bg-cyan-400 !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Bottom} className="!bg-purple-400 !w-2.5 !h-2.5" />
      <Handle type="target" position={Position.Left} className="!bg-cyan-400 !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Right} className="!bg-purple-400 !w-2.5 !h-2.5" />

      {/* Table Header */}
      <div className="px-3.5 py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-800 flex items-center justify-between">
        <span className="font-bold font-mono text-sm text-white">
          {data.label}
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
          {data.badge || 'Table'}
        </span>
      </div>

      {/* Attributes List */}
      <div className="p-2.5 space-y-1.5 text-xs font-mono max-h-56 overflow-y-auto">
        {data.attributes?.map((attr, idx) => (
          <div key={idx} className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-slate-800/50">
            <div className="flex items-center gap-1.5 truncate">
              {attr.isPk && <Key className="w-3 h-3 text-amber-400 flex-shrink-0" />}
              {attr.isFk && <Link className="w-3 h-3 text-cyan-400 flex-shrink-0" />}
              {attr.check && <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
              <span className={`truncate ${attr.isPk ? 'text-amber-300 font-bold' : attr.isFk ? 'text-cyan-300' : 'text-slate-300'}`}>
                {attr.name}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500">{attr.type}</span>
              {attr.isUq && <span className="text-[9px] px-1 rounded bg-purple-950 text-purple-400 font-bold">UQ</span>}
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-1.5 bg-slate-950/60 border-t border-slate-800/60 text-[10px] text-center font-mono text-slate-400 hover:text-cyan-400">
        Click to inspect live table data →
      </div>
    </div>
  );
}

export default function ErDiagram({ erData, onSelectTable }) {
  const nodeTypes = useMemo(() => ({ tableNode: TableNode }), []);

  if (!erData) return <div className="p-8 text-center text-slate-500 font-mono text-xs">Loading ER Schema...</div>;

  // Augment nodes with tableNode type and onSelect callback
  const nodes = erData.nodes.map(n => ({
    ...n,
    type: 'tableNode',
    data: {
      ...n.data,
      onSelectTable
    }
  }));

  // Augment edges with animated neon styling
  const edges = erData.edges.map(e => ({
    ...e,
    animated: true,
    style: { stroke: '#00F0FF', strokeWidth: 2 },
    labelStyle: { fill: '#F8FAFC', fontWeight: 700, fontFamily: 'monospace', fontSize: 11 },
    labelBgStyle: { fill: '#0F172A', fillOpacity: 0.9, stroke: '#1E293B' },
    labelBgPadding: [4, 2],
    labelBgBorderRadius: 4
  }));

  return (
    <div className="w-full h-[650px] rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 relative shadow-2xl">
      <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-300 backdrop-blur-md">
        Interactive 3NF ER Model · Draggable Nodes · Click table to view live data grid
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls className="!bg-slate-900 !border-slate-800 !text-white" />
        <MiniMap 
          nodeColor="#3b82f6" 
          maskColor="rgba(15, 23, 42, 0.8)" 
          className="!bg-slate-900 !border-slate-800"
        />
      </ReactFlow>
    </div>
  );
}
