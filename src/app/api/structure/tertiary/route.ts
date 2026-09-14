import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin, bearerToken, clientIp, enforceRateLimit, readJsonBody, securityErrorResponse } from '@/lib/request-security';
import { readJobSequence, readPredictionJob, verifyJobToken } from '@/lib/prediction-jobs';
import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import { PREDICTION_CONFIG } from '@/lib/config';
import { predictTertiary, StructurePending } from '@/lib/structure';

import { cachedStructure } from '@/lib/structure-cache';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const body = await readJsonBody<{ jobId?: unknown; sampleId?: unknown }>(req);
    const jobId = typeof body.jobId === 'string' ? body.jobId : '';
    const sampleId = typeof body.sampleId === 'string' ? body.sampleId : '';
    const job = await readPredictionJob(jobId);
    if (!verifyJobToken(job, bearerToken(req))) return NextResponse.json({ error: 'Prediction job was not found.' }, { status: 404 });
    const sequence = await readJobSequence(jobId, sampleId);
    const projectFile = path.join(PREDICTION_CONFIG.jobDir, jobId, 'structures', createHash('sha256').update(sequence).digest('hex')+'.swiss-project.json');
    return NextResponse.json({ sampleId, sequence, ...(await cachedStructure(jobId, sequence, 'tertiary', () => { return predictTertiary(sequence, {
      load: async () => { try { return (JSON.parse(await fs.readFile(projectFile, 'utf8')) as {projectId:string}).projectId; } catch(error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; } },
      save: async (projectId) => { const temp = projectFile+'.tmp'; await fs.writeFile(temp, JSON.stringify({projectId}), {mode:0o600}); await fs.rename(temp, projectFile); },
      failed: async () => { await fs.writeFile(projectFile+'.failed', '', {mode:0o600}); },
      beforeEsm: () => enforceRateLimit('tertiary-structure', clientIp(req), 5, 24 * 60 * 60 * 1000),
      beforeSubmit: () => enforceRateLimit('swiss-model-submission', clientIp(req), 5, 24 * 60 * 60 * 1000),
    }); })) });
  } catch (error: unknown) {
    if (error instanceof StructurePending) return NextResponse.json({status:'running', message:error.message}, {status:202, headers:{'Retry-After':'15'}});
    const security = securityErrorResponse(error); if (security) return security;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Tertiary-structure prediction failed.' }, { status: 400 });
  }
}
