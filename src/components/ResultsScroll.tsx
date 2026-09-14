'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';

export default function ResultsScroll({children}:{children:ReactNode}) {
  const region = useRef<HTMLDivElement>(null);
  const [position,setPosition] = useState(0);
  const [maximum,setMaximum] = useState(0);
  useEffect(()=>{
    const element=region.current;
    if(!element)return;
    const update=()=>{setMaximum(Math.max(0,element.scrollWidth-element.clientWidth));setPosition(element.scrollLeft);};
    const observer=new ResizeObserver(update);
    observer.observe(element);
    if(element.firstElementChild)observer.observe(element.firstElementChild);
    update();
    return()=>observer.disconnect();
  },[children]);
  const move=(value:number)=>{if(region.current)region.current.scrollLeft=value;};
  return <>
    {maximum>0&&<div className="border-b border-[var(--line)] bg-slate-50 px-4 py-3">
      <p id="results-scroll-hint" className="mb-2 text-sm text-slate-600">Scroll horizontally to view all columns.</p>
      <div className="flex items-center gap-3">
        <button type="button" aria-label="Scroll table left" disabled={position<=0} onClick={()=>move(Math.max(0,position-300))} className="rounded border border-[var(--line)] bg-white px-3 py-1 text-[var(--blue)] disabled:opacity-40">←</button>
        <input type="range" min={0} max={maximum} value={position} aria-label="Horizontal table position" onChange={event=>move(Number(event.target.value))} className="h-5 min-w-0 flex-1 cursor-pointer accent-[var(--blue)]"/>
        <button type="button" aria-label="Scroll table right" disabled={position>=maximum-1} onClick={()=>move(Math.min(maximum,position+300))} className="rounded border border-[var(--line)] bg-white px-3 py-1 text-[var(--blue)] disabled:opacity-40">→</button>
      </div>
    </div>}
    <div ref={region} role="region" aria-label="Prediction results table" aria-describedby={maximum>0?'results-scroll-hint':undefined} tabIndex={0} onScroll={event=>setPosition(event.currentTarget.scrollLeft)} className="results-scroll overflow-x-scroll focus-visible:outline-2 focus-visible:outline-[var(--blue)]">{children}</div>
  </>;
}
