#!/usr/bin/env bash
#SBATCH --job-name=deepnec-web
#SBATCH --partition=gpu
#SBATCH --gres=gpu:1
#SBATCH --cpus-per-task=6
#SBATCH --mem=64G
#SBATCH --time=12:00:00

set -euo pipefail
umask 077

if [[ $# -ne 4 ]]; then
  echo "Usage: $0 input.fasta Phase1|Phase2|Phase3|Phase4 final output-directory" >&2
  exit 64
fi

input_fasta=$1
level=$2
model=$3
output_dir=$4

case "$level" in
  Phase1|Phase2|Phase3|Phase4) ;;
  *) echo "Invalid DeepNEC phase: $level" >&2; exit 64 ;;
esac
if [[ "$model" != "final" ]]; then
  echo "Only the frozen final model set is deployable." >&2
  exit 64
fi
if [[ ! -f "$input_fasta" || ! -s "$input_fasta" ]]; then
  echo "Input FASTA is missing or empty: $input_fasta" >&2
  exit 66
fi

project_root=/mmfs1/scratch/jacks.local/naveen.duhan/phd/deepnec-2.0
tool_root="$project_root/round2/analysis/end_to_end_corrected/tool_a60a50c"
python_bin="$project_root/conda-envs/deepml/bin/python"
hf_cache="$project_root/round2/analysis/Phase1_trial/phase1_esm2_lora/cache/huggingface"

if [[ ! -x "$python_bin" ]]; then
  python_bin=/mmfs1/scratch/jacks.local/naveen.duhan/softwares/miniconda3/envs/deepml/bin/python
fi
if [[ ! -x "$python_bin" ]]; then
  echo "The deepml Python interpreter was not found." >&2
  exit 69
fi
if [[ ! -f "$tool_root/deepNEC/__main__.py" ]]; then
  echo "The pinned DeepNEC tool snapshot is missing: $tool_root" >&2
  exit 69
fi

mkdir -p -- "$output_dir"
export PYTHONPATH="$tool_root${PYTHONPATH:+:$PYTHONPATH}"
export HF_HOME="$hf_cache"
export HUGGINGFACE_HUB_CACHE="$hf_cache/hub"
export TRANSFORMERS_CACHE="$hf_cache/hub"
export HF_HUB_OFFLINE=1
export TRANSFORMERS_OFFLINE=1
export TF_FORCE_GPU_ALLOW_GROWTH=true
export TF_CPP_MIN_LOG_LEVEL=2

"$python_bin" -m deepNEC \
  -i "$input_fasta" \
  -od "$output_dir" \
  -o deepnec_predictions.tsv \
  -l "$level" \
  -t prot

"$python_bin" -m deepNEC.motif_scan \
  -i "$input_fasta" \
  -o "$output_dir/motif_scan_report.tsv"

if ! find "$output_dir" -maxdepth 1 -type f -name '*predictions.tsv' -size +0c -print -quit | grep -q .; then
  echo "DeepNEC finished without a non-empty prediction table." >&2
  exit 70
fi
