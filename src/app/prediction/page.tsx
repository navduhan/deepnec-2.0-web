'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bookmark, Check, Copy, Database, FileUp, Loader2, Play, RotateCcw, ShieldCheck } from 'lucide-react';
import TurnstileWidget from '@/components/TurnstileWidget';
import { withBasePath } from '@/lib/base-path';
import { buildJobBookmark } from '@/lib/job-bookmark';
import { demoSequences } from '@/data/demo-sequences';

const pathwayOptions = [
  ['all', 'Automatic — use the predicted pathway'],
  ['anammox', 'Anammox'],
  ['assimilatory', 'Assimilatory'],
  ['denitrification', 'Denitrification'],
  ['denitrification_nitrification', 'Denitrification + nitrification'],
  ['dissimilatory', 'Dissimilatory'],
  ['dissimilatory_denitrification', 'Dissimilatory + denitrification'],
  ['dissimilatory_denitrification_nitrification', 'Dissimilatory + denitrification + nitrification'],
  ['hydroxylamine_reduction', 'Hydroxylamine reduction'],
  ['nitrification', 'Nitrification'],
  ['nitrogen_fixation', 'Nitrogen fixation'],
] as const;
type Pathway = typeof pathwayOptions[number][0];
const demoKeyByPathway: Record<Pathway, string> = {
  all: 'all',
  anammox: 'anammox',
  assimilatory: 'assim',
  denitrification: 'denitri',
  denitrification_nitrification: 'dn',
  dissimilatory: 'dissim',
  dissimilatory_denitrification: 'dd',
  dissimilatory_denitrification_nitrification: 'ddn',
  hydroxylamine_reduction: 'addn',
  nitrification: 'nitri',
  nitrogen_fixation: 'nfix',
};
type Job = { jobId: string; jobToken?: string; status: 'queued'|'running'|'completed'|'failed'; message?: string; error?: string; results?: Record<string, Record<string,string|number>[]> };

async function parseResponse(response: Response) {
  const text = await response.text();
  try { return JSON.parse(text) as Job; } catch { throw new Error(`Prediction service returned ${response.status} ${response.statusText}.`); }
}
const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function poll(jobId: string, token: string, update: (message: string) => void) {
  for (;;) {
    const response = await fetch(withBasePath(`/api/predict?jobId=${encodeURIComponent(jobId)}`), { cache: 'no-store', headers: { 'X-DeepNEC-Job-Token': token } });
    const job = await parseResponse(response);
    if (!response.ok) throw new Error(job.error || 'Unable to read job status.');
    update(job.message || `Job ${job.status}`);
    if (job.status === 'completed' || job.status === 'failed') return job;
    await wait(3000);
  }
}

export default function PredictionPage() {
  const [mode, setMode] = useState<'paste'|'upload'|'accession'>('paste');
  const [sequence, setSequence] = useState('');
  const [accessions, setAccessions] = useState('');
  const [database, setDatabase] = useState<'uniprot'|'ncbi'>('uniprot');
  const [level, setLevel] = useState('Phase4');
  const [pathway, setPathway] = useState<Pathway>('all');
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Preparing secure submission…');
  const [error, setError] = useState('');
  const [turnstile, setTurnstile] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const [securityConfig, setSecurityConfig] = useState({ loaded: false, required: true, siteKey: '', error: '' });
  const [receipt, setReceipt] = useState<{jobId:string;url:string}|null>(null);
  const [copied, setCopied] = useState(false);
  const count = useMemo(() => (sequence.match(/^>/gm) || []).length, [sequence]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      const raw = localStorage.getItem('deepnec_active_job');
      if (!raw || cancelled) return;
      try {
        const active = JSON.parse(raw) as {jobId:string;jobToken:string};
        if (!active.jobId || !active.jobToken) return;
        setBusy(true); setStatus('Resuming private job monitoring…');
        const url = buildJobBookmark(active); setReceipt({jobId:active.jobId,url});
        void poll(active.jobId, active.jobToken, setStatus).then((job) => {
          if (cancelled) return;
          localStorage.removeItem('deepnec_active_job');
          if (job.status === 'failed') throw new Error(job.error || 'Prediction failed.');
          localStorage.setItem('deepnec_last_results', JSON.stringify(job));
          window.location.assign(url);
        }).catch((e: unknown) => { if (!cancelled) { setBusy(false); setError(e instanceof Error ? e.message : 'Unable to resume job.'); } });
      } catch { localStorage.removeItem('deepnec_active_job'); }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch(withBasePath('/api/security-config'), { cache: 'no-store' })
      .then(async (response) => {
        const config = await response.json() as { turnstileRequired?: boolean; turnstileSiteKey?: string };
        if (!response.ok) throw new Error('Unable to load verification settings.');
        if (!cancelled) {
          setSecurityConfig({
            loaded: true,
            required: config.turnstileRequired === true,
            siteKey: typeof config.turnstileSiteKey === 'string' ? config.turnstileSiteKey : '',
            error: '',
          });
        }
      })
      .catch(() => {
        if (!cancelled) setSecurityConfig({ loaded: true, required: true, siteKey: '', error: 'Verification is temporarily unavailable.' });
      });
    return () => { cancelled = true; };
  }, []);

  async function fetchAccessions() {
    if (!accessions.trim()) return setError('Enter at least one accession.');
    setBusy(true); setStatus('Retrieving protein sequences…'); setError('');
    try {
      const response = await fetch(withBasePath('/api/accession'), { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({accessions,database:database,db:database}) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Accession retrieval failed.');
      setSequence(data.fasta); setMode('paste'); setDemoLoaded(false);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Accession retrieval failed.'); }
    finally { setBusy(false); }
  }

  async function submit() {
    if (!sequence.trim().startsWith('>')) return setError('Provide protein FASTA beginning with a header line (>).');
    if (!securityConfig.loaded) return setError('Wait for the anti-bot verification to load.');
    if (securityConfig.required && !securityConfig.siteKey) return setError('Anti-bot verification is not configured correctly.');
    if (securityConfig.required && !turnstile) return setError('Complete the anti-bot check before submitting.');
    setBusy(true); setStatus('Submitting your sequences…'); setError('');
    try {
      const response = await fetch(withBasePath('/api/predict'), { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({sequence,level,pathway:level==='Phase4'?pathway:'all',model:'final',turnstileToken:turnstile}) });
      const job = await parseResponse(response);
      if (!response.ok || !job.jobToken) throw new Error(job.error || 'Job submission failed.');
      const active = {jobId:job.jobId,jobToken:job.jobToken};
      localStorage.setItem('deepnec_active_job', JSON.stringify(active));
      const url = buildJobBookmark(active); setReceipt({jobId:job.jobId,url});
      const complete = await poll(job.jobId, job.jobToken, setStatus);
      localStorage.removeItem('deepnec_active_job');
      if (complete.status === 'failed') throw new Error(complete.error || 'Prediction failed.');
      localStorage.setItem('deepnec_last_results', JSON.stringify(complete));
      window.location.assign(url);
    } catch (e: unknown) { setBusy(false); setError(e instanceof Error ? e.message : 'Prediction failed.'); setTurnstile(''); setResetKey((v)=>v+1); }
  }

  function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    setFileName(file.name); const reader = new FileReader();
    reader.onload = () => { setSequence(String(reader.result || '').trim()); setDemoLoaded(false); }; reader.readAsText(file);
  }

  function clear() { setSequence(''); setAccessions(''); setFileName(''); setError(''); setReceipt(null); setLevel('Phase4'); setPathway('all'); setDemoLoaded(false); }

  function loadExample() {
    setSequence(demoSequences[demoKeyByPathway[pathway]] || demoSequences.all);
    setMode('paste');
    setDemoLoaded(true);
  }

  function changePathway(next: Pathway) {
    setPathway(next);
    if (demoLoaded) setSequence(demoSequences[demoKeyByPathway[next]] || demoSequences.all);
  }

  return <div className="space-y-7 py-4 sm:py-8">
    <header className="rounded-[1.75rem] border border-[#d7e5f0] bg-gradient-to-r from-[#f3f8fc] to-[#fff7fa] px-6 py-8 sm:px-9"><p className="eyebrow">DeepNEC prediction server</p><h1 className="mt-2 font-display text-3xl font-semibold text-[var(--navy)] sm:text-4xl">Predict nitrogen-metabolism function</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Provide protein sequences and choose the level of functional detail you need.</p></header>
    {error && <div role="alert" className="rounded-xl border border-[#efb4c2] bg-[#fff4f7] px-4 py-3 text-sm font-semibold text-[var(--danger)]">{error}</div>}
    <div className="grid gap-7 lg:grid-cols-[1.2fr_.8fr]">
      <section className="surface p-5 sm:p-7"><div className="flex items-start justify-between"><div><p className="eyebrow">Step 1</p><h2 className="mt-1 font-display text-2xl font-semibold text-[var(--navy)]">Protein input</h2></div><button type="button" onClick={clear} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[var(--blue)]"><RotateCcw className="h-3.5 w-3.5"/> Clear</button></div>
        <div className="mt-5 grid grid-cols-3 gap-1 rounded-xl bg-[var(--ice)] p-1">{(['paste','upload','accession'] as const).map((item)=><button key={item} type="button" onClick={()=>setMode(item)} className={`rounded-lg px-3 py-2 text-xs font-bold capitalize ${mode===item?'bg-white text-[var(--navy)] shadow-sm':'text-slate-500'}`}>{item}</button>)}</div>
        {mode==='accession' && <div className="mt-5 space-y-3"><div className="grid grid-cols-[130px_1fr] gap-3"><select className="field" value={database} onChange={(e)=>setDatabase(e.target.value as 'uniprot'|'ncbi')}><option value="uniprot">UniProtKB</option><option value="ncbi">NCBI Protein</option></select><input className="field" value={accessions} onChange={(e)=>setAccessions(e.target.value)} placeholder="Q9S7D1, accession…" /></div><button type="button" onClick={fetchAccessions} className="btn-secondary"><Database className="h-4 w-4"/> Retrieve sequences</button></div>}
        {mode==='upload' && <label className="mt-5 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#a9c4da] bg-[#f8fbfe] text-center"><FileUp className="h-7 w-7 text-[var(--blue)]"/><span className="mt-3 text-sm font-bold text-[var(--navy)]">Choose or drop a FASTA file</span><span className="mt-1 text-xs text-slate-500">{fileName || '.fasta, .fa, or .txt'}</span><input className="sr-only" type="file" accept=".fasta,.fa,.faa,.txt" onChange={upload}/></label>}
        <div className={`${mode==='paste'?'mt-5':'mt-4'}`}><div className="mb-2 flex items-center justify-between"><label htmlFor="deepnec-fasta" className="text-sm font-bold text-[var(--navy)]">FASTA sequence</label><button type="button" onClick={loadExample} className="text-xs font-bold text-[var(--blue)]">Load example</button></div><textarea id="deepnec-fasta" rows={12} className="field resize-y font-mono text-xs leading-6" value={sequence} onChange={(e)=>{setSequence(e.target.value);setDemoLoaded(false)}} placeholder=">protein_id&#10;MSEQUENCE…"/><p className="mt-2 text-xs text-slate-500">{count ? `${count} protein record${count===1?'':'s'} detected` : 'Use standard amino-acid FASTA. X residues are accepted and removed before prediction.'}</p></div>
      </section>
      <aside className="space-y-5"><section className="surface p-5 sm:p-7"><p className="eyebrow">Step 2</p><h2 className="mt-1 font-display text-2xl font-semibold text-[var(--navy)]">Prediction level</h2><div className="mt-5 space-y-2">{[['Phase1','Enzyme or non-enzyme'],['Phase2','Nitrogen metabolism'],['Phase3','Biological pathway'],['Phase4','Terminal EC label']].map(([value,label],i)=><label key={value} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${level===value?'border-[var(--blue)] bg-[#f1f7fc]':'border-[var(--line)]'}`}><input type="radio" name="level" value={value} checked={level===value} onChange={()=>setLevel(value)} className="accent-[#2b6cb0]"/><span><strong className="block text-sm text-[var(--navy)]">Phase {i+1}</strong><span className="text-xs text-slate-500">{label}</span></span></label>)}</div>{level==='Phase4'&&<div className="mt-5 border-t border-[var(--line)] pt-5"><label htmlFor="phase4-pathway" className="text-sm font-bold text-[var(--navy)]">Phase 4 pathway</label><select id="phase4-pathway" className="field mt-2" value={pathway} onChange={(e)=>changePathway(e.target.value as Pathway)}>{pathwayOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><p className="mt-2 text-xs leading-5 text-slate-500">Automatic uses the pathway predicted in Phase 3. Choose a pathway to restrict EC assignment to that route.</p></div>}</section>
        <section className="rounded-[1.5rem] bg-[var(--navy)] p-6 text-white"><ShieldCheck className="h-5 w-5 text-[#9fccef]"/><h2 className="mt-4 font-display text-xl font-semibold">Ready to predict?</h2><p className="mt-2 text-xs leading-5 text-slate-300">Your results will be available through a private link for 30 days.</p><div className="mt-5 min-h-[65px]">{!securityConfig.loaded?<div className="flex min-h-[65px] items-center gap-2 text-xs text-slate-300"><Loader2 className="h-4 w-4 animate-spin"/> Loading verification…</div>:securityConfig.error?<div role="alert" className="rounded-lg border border-[#efb4c2] bg-[#fff4f7] p-3 text-xs font-semibold text-[var(--danger)]">{securityConfig.error}</div>:securityConfig.required?<TurnstileWidget siteKey={securityConfig.siteKey} resetKey={resetKey} onToken={setTurnstile}/>:<p className="text-xs text-slate-300">Verification is not required.</p>}</div><button type="button" disabled={busy||!securityConfig.loaded||Boolean(securityConfig.error)} onClick={submit} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--pink)] px-4 py-3 text-sm font-black text-white transition hover:bg-[#d9597b] disabled:opacity-60">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<Play className="h-4 w-4"/>}{busy?'Running…':'Start prediction'}</button></section>
      </aside>
    </div>
    {busy && <section aria-live="polite" className="surface p-5"><div className="flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin text-[var(--blue)]"/><div><p className="text-sm font-bold text-[var(--navy)]">{status}</p><p className="mt-1 text-xs text-slate-500">You may keep this page open or bookmark the private result link.</p></div></div>{receipt&&<div className="mt-4 flex flex-col gap-3 rounded-xl bg-[#f4f8fb] p-4 sm:flex-row sm:items-center"><Bookmark className="h-4 w-4 text-[var(--pink)]"/><code className="min-w-0 flex-1 truncate text-xs">{receipt.url}</code><button type="button" className="btn-secondary" onClick={()=>void navigator.clipboard.writeText(receipt.url).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),1500)})}>{copied?<Check className="h-4 w-4"/>:<Copy className="h-4 w-4"/>}{copied?'Copied':'Copy'}</button></div>}</section>}
  </div>;
}
