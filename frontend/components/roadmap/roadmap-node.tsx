'use client';

import type { Node, NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import { Icon } from '@iconify/react';

export type RoadmapNodeData = {
  title: string;
  subtitle: string;
  status: 'Live' | 'Planned' | 'Exploratory';
  // Either an Iconify id (brand logos like Ethereum/BNB/Bitcoin) or a local
  // asset path (Akad's own mark, Midnight's mark) -- whichever the node has.
  icon?: string;
  iconSrc?: string;
};

export type RoadmapNodeType = Node<RoadmapNodeData, 'roadmap'>;

const STATUS_STYLE: Record<RoadmapNodeData['status'], string> = {
  Live: 'bg-akd-accent text-black',
  Planned: 'bg-white/15 text-white',
  Exploratory: 'bg-white/10 text-white/50',
};

// Custom React Flow node for the /roadmap diagram: a small brand-styled
// card (icon, title, one-line subtitle, status pill) instead of the
// library's plain default box.
export function RoadmapNode({ data }: NodeProps<RoadmapNodeType>) {
  return (
    <div className="w-60 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <Handle type="target" position={Position.Left} className="!border-0 !bg-white/20" />

      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/40">
          {data.iconSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- static asset from /public, no next/image optimization needed for a small SVG mark
            <img src={data.iconSrc} alt="" className="h-5 w-5" />
          ) : (
            <Icon icon={data.icon ?? ''} width={20} height={20} />
          )}
        </span>
        <span className="text-sm font-medium text-white">{data.title}</span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-white/50">{data.subtitle}</p>

      <span
        className={`mt-3 inline-block rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${STATUS_STYLE[data.status]}`}
      >
        {data.status}
      </span>

      <Handle type="source" position={Position.Right} className="!border-0 !bg-white/20" />
    </div>
  );
}
