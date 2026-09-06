# DeepNEC 2.0 Web

A multi-page Next.js interface and secure HPC prediction gateway for DeepNEC 2.0. The production application is mounted at `/deepnec-2.0` and includes separate About, Prediction, Results, Download, and Help pages.

## Application structure

```text
src/app/                 Next.js pages and API routes
src/components/          Shared navigation and interface components
src/lib/                 FASTA validation, private jobs, SSH, and SLURM runner
deploy/                  Hardened container and reverse-proxy configuration
deploy/hpc/              Pinned HPC inference entry point
public/assets/           First-party project and laboratory artwork
frontend/ and backend/   Previous implementation retained as migration reference
```

The web server never runs large inference in-process. It transfers validated protein FASTA over pinned-key SSH, submits the frozen model pipeline with `sbatch --parsable --wait`, retrieves only allow-listed TSV files, and removes the temporary cluster job directory. Private results require a per-job token and expire after 30 days.

## Local interface development

```bash
npm install
npm run dev
```

Open `http://localhost:3000/deepnec-2.0`. Without cluster credentials, the informational pages remain usable, while prediction submission will report that the executor is not configured.

## Quality checks

```bash
npm run lint
npm run build
```

## Deployment

Use the hardened rootless Podman or Docker Compose configuration documented in [`deploy/README.md`](deploy/README.md). Copy `deploy/hpc/run_deepnec_web.slurm` to the location configured by `BIOCLUSTER_REMOTE_SCRIPT`; it accepts:

```text
input.fasta Phase1|Phase2|Phase3|Phase4 pathway final output-directory
```

The production web limits are 100 protein records, 100,000 total residues, and 5,000 residues per record. Only the 20 standard amino acids and `X` pass web validation; the deployed DeepNEC CLI removes `X` before feature extraction.

## License

DeepNEC first-party code is distributed under the [GNU General Public License v3.0](LICENSE). The project was developed by the KAABiL laboratory at Utah State University.
