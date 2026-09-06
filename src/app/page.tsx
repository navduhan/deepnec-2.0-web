import Link from 'next/link';
import { ArrowRight, BookOpen, CheckCircle2, Cpu, Route, ShieldCheck } from 'lucide-react';

const stages = [
  ['01', 'Enzyme', 'Enzyme or non-enzyme'],
  ['02', 'Nitrogen', 'Nitrogen metabolism filter'],
  ['03', 'Pathway', 'Ten biological pathways'],
  ['04', 'EC number', 'Pathway-specific EC assignment'],
];

export default function Home() {
  return <div className="space-y-16 pb-12 pt-4 sm:pt-8">
    <section className="relative overflow-hidden rounded-[2rem] border border-[#d8e6f0] bg-gradient-to-br from-[#f7fbff] via-white to-[#fff8fa] px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
      <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full border-[50px] border-[#e8f2fa]" />
      <div className="relative grid gap-10 lg:grid-cols-[1.02fr_.98fr] lg:items-center">
        <div>
          <p className="eyebrow">Hierarchical protein annotation</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.08] tracking-[-.035em] text-[var(--navy)] sm:text-5xl lg:text-6xl">Nitrogen metabolism prediction, <span className="text-[var(--blue)]">from sequence to EC.</span></h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600">DeepNEC 2.0 routes protein sequences through four independently trained decisions to identify enzymes, nitrogen-metabolism proteins, biological pathways, and Enzyme Commission labels.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/prediction" className="btn-primary">Start prediction <ArrowRight className="h-4 w-4" /></Link><a href="#workflow" className="btn-secondary">View workflow <Route className="h-4 w-4" /></a></div>
        </div>
        <div className="surface p-4 sm:p-6" aria-label="DeepNEC hierarchy">
          <div className="mb-4 flex items-center justify-between"><div><p className="eyebrow">Four-phase route</p><p className="mt-1 text-sm text-slate-500">Only qualifying sequences move forward</p></div><Cpu className="h-5 w-5 text-[var(--blue)]" /></div>
          <div className="grid gap-2 sm:grid-cols-2">
            {stages.map(([number,label,detail], index) => <div key={number} className={`rounded-2xl border p-4 ${index === 3 ? 'border-[#f0bdca] bg-[var(--pink-soft)]' : 'border-[#d9e6f0] bg-[#fafdff]'}`}><span className="text-xs font-black tracking-[.14em] text-[var(--blue)]">{number}</span><p className="mt-2 font-display text-xl font-semibold text-[var(--navy)]">{label}</p><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></div>)}
          </div>
        </div>
      </div>
    </section>

    <section id="workflow" className="scroll-mt-28">
      <p className="eyebrow">How it works</p><h2 className="mt-2 font-display text-3xl font-semibold text-[var(--navy)] sm:text-4xl">Four steps from sequence to function</h2>
      <div className="mt-7 grid gap-4 md:grid-cols-4">{stages.map(([number,label,detail], index) => <article key={number} className="relative rounded-2xl border border-[var(--line)] bg-white p-5"><div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--navy)] text-xs font-black text-white">{number}</span>{index < 3 && <ArrowRight className="hidden h-4 w-4 translate-x-7 text-[var(--pink)] md:block" />}</div><h3 className="mt-5 font-display text-xl font-semibold text-[var(--navy)]">{label}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p></article>)}</div>
    </section>

    <section className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
      <article className="surface p-7 sm:p-9"><p className="eyebrow">Designed for protein annotation</p><h2 className="mt-3 font-display text-3xl font-semibold text-[var(--navy)]">One guided workflow from protein sequence to EC number.</h2><div className="mt-6 grid gap-4 sm:grid-cols-2"><p className="flex gap-3 text-sm leading-6 text-slate-600"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[var(--blue)]" />DeepNEC automatically applies the prediction steps needed for each sequence.</p><p className="flex gap-3 text-sm leading-6 text-slate-600"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[var(--blue)]" />Results are available through a private link and retained for 30 days.</p></div></article>
      <aside className="rounded-[1.5rem] bg-[var(--navy)] p-7 text-white sm:p-9"><BookOpen className="h-6 w-6 text-[#8fc6ef]" /><h2 className="mt-5 font-display text-3xl font-semibold">Ready to annotate?</h2><p className="mt-3 text-sm leading-6 text-slate-300">Paste FASTA, upload a protein file, or retrieve protein accessions to begin.</p><Link href="/prediction" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#9fd0f4] hover:text-white">Open prediction server <ArrowRight className="h-4 w-4" /></Link></aside>
    </section>
  </div>;
}
