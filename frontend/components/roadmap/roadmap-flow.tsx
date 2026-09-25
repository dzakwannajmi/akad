'use client';

import { ReactFlow, Background, type Edge } from '@xyflow/react';
import { RoadmapNode, type RoadmapNodeType } from './roadmap-node';

const nodeTypes = { roadmap: RoadmapNode };

// Left to right: what's live today, what has to ship before any of this is
// possible, and the exploratory cross-chain targets that all depend on it.
// None of the "Exploratory" branches are an Akad commitment -- they depend
// entirely on Midnight's own bridge infrastructure, which Akad has no
// control over or timeline for.
const nodes: RoadmapNodeType[] = [
  {
    id: 'akad',
    type: 'roadmap',
    position: { x: 0, y: 140 },
    data: {
      title: 'Akad on Midnight',
      subtitle: 'AKD ⇄ NIGHT, live on Midnight’s Preview and Preprod testnets today.',
      status: 'Live',
      iconSrc: '/token/logo.svg',
    },
  },
  {
    id: 'midnight-mainnet',
    type: 'roadmap',
    position: { x: 320, y: 140 },
    data: {
      title: 'Midnight mainnet',
      subtitle: 'Depends on Midnight shipping its own mainnet and bridges first.',
      status: 'Planned',
      iconSrc: '/token/midnight-token.svg',
    },
  },
  {
    id: 'ethereum',
    type: 'roadmap',
    position: { x: 680, y: -40 },
    data: {
      title: 'Ethereum',
      subtitle: 'Only possible once Midnight bridges out to Ethereum.',
      status: 'Exploratory',
      icon: 'token-branded:ethereum',
    },
  },
  {
    id: 'bnb',
    type: 'roadmap',
    position: { x: 680, y: 140 },
    data: {
      title: 'BNB Chain',
      subtitle: 'Only possible once Midnight bridges out to BNB Chain.',
      status: 'Exploratory',
      icon: 'token-branded:binance-smart-chain',
    },
  },
  {
    id: 'bitcoin',
    type: 'roadmap',
    position: { x: 680, y: 320 },
    data: {
      title: 'Bitcoin',
      subtitle: 'Only possible once Midnight bridges out to Bitcoin.',
      status: 'Exploratory',
      icon: 'token-branded:bitcoin',
    },
  },
];

const edges: Edge[] = [
  {
    id: 'akad-mainnet',
    source: 'akad',
    target: 'midnight-mainnet',
    animated: true,
    style: { stroke: 'rgba(255,255,255,0.35)' },
  },
  {
    id: 'mainnet-eth',
    source: 'midnight-mainnet',
    target: 'ethereum',
    style: { stroke: 'rgba(255,255,255,0.15)', strokeDasharray: '4 4' },
  },
  {
    id: 'mainnet-bnb',
    source: 'midnight-mainnet',
    target: 'bnb',
    style: { stroke: 'rgba(255,255,255,0.15)', strokeDasharray: '4 4' },
  },
  {
    id: 'mainnet-btc',
    source: 'midnight-mainnet',
    target: 'bitcoin',
    style: { stroke: 'rgba(255,255,255,0.15)', strokeDasharray: '4 4' },
  },
];

// A static, illustrative diagram rather than an editor: dragging,
// connecting, and zoom/pan gestures are all switched off so it behaves
// like a picture embedded in the page instead of trapping scroll or click
// events meant for the rest of the site.
export function RoadmapFlow() {
  return (
    <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] sm:h-[480px]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        panOnScroll={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
      >
        <Background gap={28} size={1} color="rgba(255,255,255,0.06)" />
      </ReactFlow>
    </div>
  );
}
