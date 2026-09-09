# DeepNEC 2.0 VM deployment

This deployment runs the Next.js application behind an unprivileged Nginx gateway on VM loopback port 3365. Prediction inputs are transferred over pinned-key SSH/SFTP to the configured cluster, submitted with `sbatch --parsable --wait`, and the allow-listed TSV result files are retrieved over SFTP.

## VM preparation

Install Docker Engine and its Compose plugin, then clone this repository. Create the runtime-only directories and environment file:

```bash
mkdir -p public/download deploy/data/jobs
cp deploy/docker.env.example deploy/docker.env
openssl rand -hex 32
```

Put the generated value in `JOB_OWNER_HMAC_SECRET`. Fill in the remaining placeholders in `deploy/docker.env`. The environment file and job data are ignored by Git.

Use a dedicated, restricted cluster SSH key. Verify the cluster ED25519 fingerprint with the cluster administrator through a separate trusted channel before setting `BIOCLUSTER_HOST_KEY_SHA256`:

```bash
ssh-keyscan -p 22 -t ed25519 biocluster.example.edu | ssh-keygen -lf - -E sha256
chmod 0600 /absolute/path/to/dedicated-private-key
```

`ssh-keyscan` discovers a key but does not establish trust by itself. Password authentication is not supported by this deployment.

Install `deploy/hpc/run_deepnec_web.slurm` on the cluster and set `BIOCLUSTER_REMOTE_SCRIPT` to its absolute path. The script accepts `input.fasta level pathway model output-directory`, uses the pinned final tool snapshot, writes tab-delimited results only under the supplied output directory, and returns a nonzero exit code on failure. Update its site-specific project, Python, and cache paths before deployment if the HPC layout changes.

## Start

The recommended interactive setup from the repository root is:

```bash
./start.sh
```

It safely creates `deploy/docker.env`, validates the selected Compose configuration, builds the images, starts the services, and performs a health check. To populate and validate the environment file without starting containers, run `./start.sh --configure-only`.

### Rootless Podman (recommended on RHEL-family VMs)

Install the external Compose provider, then run the deployment as the unprivileged VM user without `sudo`:

```bash
sudo dnf install -y podman-compose
podman info --format '{{.Host.Security.Rootless}}'
podman compose --env-file deploy/docker.env \
  -f deploy/compose.yaml \
  -f deploy/compose.podman.yaml \
  up -d --build
```

The rootless check must print `true`. The Podman overlay uses `keep-id` for the application process and private SELinux relabeling for its bind mounts. It also mounts the dedicated cluster key read-only; do not add `compose.ssh-key.yaml` to the Podman command.

### Docker Engine

```bash
docker compose --env-file deploy/docker.env -f deploy/compose.yaml -f deploy/compose.ssh-key.yaml up -d --build
```

The gateway listens only on `127.0.0.1:3365` by default. When the HTTPS reverse proxy is on another host, set `PUBLIC_BIND_ADDRESS` to the VM's private interface address and set `TRUSTED_PROXY_CIDR` to the reverse proxy's exact source address with a `/32` prefix. Restrict TCP port 3365 at the VM firewall to that same source address. Never expose the internal application container.

Check the deployment:

```bash
podman compose --env-file deploy/docker.env -f deploy/compose.yaml -f deploy/compose.podman.yaml ps
podman compose --env-file deploy/docker.env -f deploy/compose.yaml -f deploy/compose.podman.yaml logs -f app gateway
curl --fail http://127.0.0.1:3365/deepnec-2.0
```

## Results retention

Private results are retained for 30 days by default (`PREDICTION_JOB_RETENTION_MS=2592000000`). Install the included cleanup command in the rootless Podman user's crontab, replacing `/absolute/path/to/deepnec-2.0-web` with the cloned repository path:

```cron
17 3 * * * /absolute/path/to/deepnec-2.0-web/deploy/prune-expired-jobs.sh
```

Run `crontab -e` as the same unprivileged user that owns `deploy/data/jobs`; do not install this in root's crontab. The application also prunes expired directories when accepting a new job.

Place release archives in `public/download/` only if direct downloads should be enabled. The directory is mounted at runtime and is never stored in Git or baked into the image.

## Structure prediction

The application image installs the pinned S4PRED source and verified model weights during the Docker build using `deploy/install-s4pred.sh`. Secondary-structure requests therefore run inside the application container. Tertiary structures use ESMFold for sequences up to 400 residues and SWISS-MODEL for longer proteins. Set `SWISS_MODEL_TOKEN` in `deploy/docker.env` to enable the longer-sequence fallback.

## Optional local fallback

Cluster execution is always attempted first. Local inference remains disabled unless `deploy/compose.local-fallback.yaml` is added explicitly and `LOCAL_PREDICTOR_DIR` points to a read-only predictor installation containing `.venv/bin/python`, `deepnec.py`, packages, and models.

Do not use the fallback overlay on a resource-constrained VM until its CPU and memory limits have been reviewed.
