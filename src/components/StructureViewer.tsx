'use client';

import { useEffect, useRef } from 'react';

export default function StructureViewer({ pdb }: { pdb: string }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current || !pdb) return;
    let disposed = false;
    let stage: import('ngl').Stage | undefined;
    void import('ngl').then((NGL) => {
      if (disposed || !container.current) return;
      const currentStage = new NGL.Stage(container.current, { backgroundColor: 'white' });
      stage = currentStage;
      return currentStage.loadFile(new Blob([pdb], { type: 'text/plain' }), { ext: 'pdb' }).then((component) => {
        if (!component) return;
        component.addRepresentation('cartoon', { colorScheme: 'chainid' });
        component.addRepresentation('ball+stick', { sele: 'hetero' });
        component.autoView();
      });
    });
    const resize = () => stage?.handleResize(); window.addEventListener('resize', resize);
    return () => { disposed = true; window.removeEventListener('resize', resize); stage?.dispose(); };
  }, [pdb]);
  return <div ref={container} className="h-[520px] w-full rounded-xl border border-[var(--line)] bg-white" aria-label="Interactive three-dimensional protein structure" />;
}
