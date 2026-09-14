import { withBasePath } from './base-path';

/** Resume the same remote project while it is queued or running. */
export async function fetchStructure(kind: string, jobId: string, sampleId: string, token: string) {
  for (;;) {
    const response = await fetch(withBasePath('/api/structure/'+kind), {
      method: 'POST', headers: {'Content-Type':'application/json', 'X-DeepNEC-Job-Token':token},
      body: JSON.stringify({jobId, sampleId}),
    });
    const value = await response.json();
    if (response.status === 202) {
      await new Promise(resolve => setTimeout(resolve, 15_000));
      continue;
    }
    if (!response.ok) throw new Error(value.error || 'Structure prediction failed.');
    return value;
  }
}
