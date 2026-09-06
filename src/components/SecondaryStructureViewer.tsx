'use client';

type Secondary = { amino_acids: string; prediction: string; confidence: string };
type Segment = { state: string; start: number; end: number };

function segments(states: string): Segment[] {
  const result: Segment[] = [];
  for (let i = 0; i < states.length; i += 1) {
    const last = result.at(-1);
    if (last?.state === states[i]) last.end = i;
    else result.push({ state: states[i], start: i, end: i });
  }
  return result;
}

export default function SecondaryStructureViewer({ data }: { data: Secondary }) {
  const width = 940, left = 66, cell = 16, blockSize = 50;
  const blocks = Math.ceil(data.amino_acids.length / blockSize);
  return <div className="mt-5 space-y-4" aria-label="S4PRED secondary-structure cartoon">
    {Array.from({ length: blocks }, (_, block) => {
      const start = block * blockSize;
      const aa = data.amino_acids.slice(start, start + blockSize);
      const pred = data.prediction.slice(start, start + blockSize);
      const conf = data.confidence.slice(start, start + blockSize);
      return <div key={start} className="overflow-x-auto rounded-xl border border-[var(--line)] bg-white p-3">
        <svg viewBox={`0 0 ${width} 155`} className="min-w-[760px]" role="img" aria-label={`Residues ${start + 1} to ${start + aa.length}`}>
          <g fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="11" fill="#334155">
            <text x="8" y="37" fontWeight="700">Conf</text><text x="8" y="69" fontWeight="700">Cart</text><text x="8" y="101" fontWeight="700">Pred</text><text x="8" y="127" fontWeight="700">AA</text>
            {Array.from(conf).map((value,i)=>{const score=Number(value)||0;return <rect key={i} x={left+i*cell} y={42-score*3} width={cell-2} height={score*3} rx="1" fill={`hsl(207 62% ${78-score*4}%)`}><title>Residue {start+i+1}: confidence {score}</title></rect>})}
            {segments(pred).map((segment,i)=>{const x=left+segment.start*cell,w=(segment.end-segment.start+1)*cell;return segment.state==='H'?<rect key={i} x={x} y="57" width={w-1} height="15" rx="7" fill="#dc5679"><title>Helix</title></rect>:segment.state==='E'?<polygon key={i} points={`${x},57 ${x+w-9},57 ${x+w-1},64.5 ${x+w-9},72 ${x},72`} fill="#27866d"><title>Strand</title></polygon>:<line key={i} x1={x} x2={x+w} y1="64.5" y2="64.5" stroke="#64748b" strokeWidth="4"><title>Coil</title></line>})}
            {Array.from(pred).map((value,i)=><text key={i} x={left+i*cell+3} y="101" fontWeight="700">{value}</text>)}
            {Array.from(aa).map((value,i)=><text key={i} x={left+i*cell+3} y="127" fontWeight="700">{value}<title>Residue {start+i+1}: {value}, {pred[i]}, confidence {conf[i]}</title></text>)}
            {Array.from(aa).map((_,i)=>(i===0||(start+i+1)%10===0)?<g key={i}><line x1={left+i*cell+6} x2={left+i*cell+6} y1="132" y2="137" stroke="#94a3b8"/><text x={left+i*cell-1} y="150" fontSize="9">{start+i+1}</text></g>:null)}
          </g>
        </svg>
      </div>;
    })}
    <div className="flex flex-wrap gap-5 text-xs font-semibold text-slate-600"><span className="flex items-center gap-2"><i className="h-3 w-7 rounded-full bg-[#dc5679]"/>Helix (H)</span><span className="flex items-center gap-2"><i className="h-3 w-7 bg-[#27866d]"/>Strand (E)</span><span className="flex items-center gap-2"><i className="h-1 w-7 bg-slate-500"/>Coil (C)</span><span>Confidence: 0–9</span></div>
  </div>;
}
