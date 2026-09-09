#!/usr/bin/env bash
#SBATCH --job-name=deepnec-web
#SBATCH --partition=gpu
#SBATCH --gres=gpu:1
#SBATCH --cpus-per-task=6
#SBATCH --mem=64G
#SBATCH --time=12:00:00

set -euo pipefail
umask 077

app_dir="${DEEPNEC_APP_DIR:-$HOME/naveen_tools/deepnec-2.0}"
launcher="$app_dir/deepnec.sl"
if [[ ! -f "$launcher" ]]; then
  echo "The maintained DeepNEC launcher is missing: $launcher" >&2
  echo "Set DEEPNEC_APP_DIR to the deployed standalone repository." >&2
  exit 69
fi

project_root="${DEEPNEC_PROJECT_ROOT:-/mmfs1/scratch/jacks.local/naveen.duhan/phd/deepnec-2.0}"
export DEEPNEC_APP_DIR="$app_dir"
export PYTHON_BIN="${PYTHON_BIN:-$project_root/conda-envs/deepml/bin/python}"
export HF_HOME="${HF_HOME:-$project_root/round2/analysis/Phase1_trial/phase1_esm2_lora/cache/huggingface}"
export HUGGINGFACE_HUB_CACHE="${HUGGINGFACE_HUB_CACHE:-$HF_HOME/hub}"
export TRANSFORMERS_CACHE="${TRANSFORMERS_CACHE:-$HF_HOME/hub}"
export HF_HUB_OFFLINE=1
export TRANSFORMERS_OFFLINE=1
export TF_FORCE_GPU_ALLOW_GROWTH=true
export TF_CPP_MIN_LOG_LEVEL=2

exec bash "$launcher" "$@"
