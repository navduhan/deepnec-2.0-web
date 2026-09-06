import { execFile } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';
import { PREDICTION_CONFIG } from './config';

const gunzip = promisify(zlib.gunzip);
const message = (error: unknown) => error instanceof Error ? error.message : String(error);

export type SecondaryStructure = { amino_acids: string; prediction: string; confidence: string };

export async function predictSecondary(sequence: string): Promise<SecondaryStructure> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'deepnec-s4pred-'));
  const fasta = path.join(directory, 'sequence.fasta');
  try {
    await fs.writeFile(fasta, `>query\n${sequence}\n`, { encoding: 'utf8', mode: 0o600 });
    const output = await new Promise<string>((resolve, reject) => {
      execFile(PREDICTION_CONFIG.structure.s4predPython, [PREDICTION_CONFIG.structure.s4predScript, '-T', '1', '-t', 'horiz', fasta], {
        timeout: 120_000,
        maxBuffer: 10 * 1024 * 1024,
      }, (error, stdout, stderr) => error ? reject(new Error(stderr || error.message)) : resolve(stdout));
    });
    let amino_acids = ''; let prediction = ''; let confidence = '';
    for (const line of output.split(/\r?\n/)) {
      const value = line.trim().split(/\s+/)[1] || '';
      if (line.startsWith('  AA:')) amino_acids += value;
      else if (line.startsWith('Pred:')) prediction += value;
      else if (line.startsWith('Conf:')) confidence += value;
    }
    if (!prediction || prediction.length !== amino_acids.length) throw new Error('S4PRED returned an incomplete result.');
    return { amino_acids, prediction, confidence };
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

async function esmFold(sequence: string) {
  const response = await fetch('https://api.esmatlas.com/foldSequence/v1/pdb/', {
    method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: sequence, signal: AbortSignal.timeout(180_000), cache: 'no-store',
  });
  if (!response.ok) throw new Error(`ESMFold returned HTTP ${response.status}.`);
  return response.text();
}

async function swissModel(sequence: string) {
  const token = PREDICTION_CONFIG.structure.swissModelToken;
  if (!token) throw new Error('SWISS_MODEL_TOKEN is not configured for sequences longer than 400 residues.');
  const submitted = await fetch('https://swissmodel.expasy.org/automodel', {
    method: 'POST', headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_sequences: sequence, project_title: 'DeepNEC 2.0 structure prediction' }), signal: AbortSignal.timeout(30_000), cache: 'no-store',
  });
  if (!submitted.ok) throw new Error(`SWISS-MODEL submission returned HTTP ${submitted.status}.`);
  const project = await submitted.json() as { project_id?: string };
  if (!project.project_id) throw new Error('SWISS-MODEL did not return a project identifier.');
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    const statusResponse = await fetch(`https://swissmodel.expasy.org/project/${encodeURIComponent(project.project_id)}/models/summary/`, {
      headers: { Authorization: `Token ${token}` }, signal: AbortSignal.timeout(30_000), cache: 'no-store',
    });
    if (!statusResponse.ok) throw new Error(`SWISS-MODEL status returned HTTP ${statusResponse.status}.`);
    const status = await statusResponse.json() as { status?: string; models?: { coordinates_url?: string }[] };
    if (status.status === 'FAILED') throw new Error('SWISS-MODEL structure prediction failed.');
    if (status.status === 'COMPLETED') {
      const url = status.models?.[0]?.coordinates_url;
      if (!url) throw new Error('SWISS-MODEL completed without coordinates.');
      const coordinates = await fetch(url, { signal: AbortSignal.timeout(60_000), cache: 'no-store' });
      if (!coordinates.ok) throw new Error(`SWISS-MODEL coordinates returned HTTP ${coordinates.status}.`);
      const buffer = Buffer.from(await coordinates.arrayBuffer());
      try { return (await gunzip(buffer)).toString('utf8'); } catch { return buffer.toString('utf8'); }
    }
  }
  throw new Error('SWISS-MODEL structure prediction timed out.');
}

export async function predictTertiary(sequence: string) {
  try {
    if (sequence.length <= 400) return { pdb: await esmFold(sequence), method: 'ESMFold' };
    return { pdb: await swissModel(sequence), method: 'SWISS-MODEL' };
  } catch (error) {
    throw new Error(`Tertiary-structure prediction failed: ${message(error)}`);
  }
}
