#!/usr/bin/env bash
set -euo pipefail

S4PRED_COMMIT=5bc16ee55d98015ca4bbdc6741ab0c64f6f7744b
S4PRED_REPOSITORY=https://github.com/psipred/s4pred.git
S4PRED_WEIGHTS_URL=http://bioinfadmin.cs.ucl.ac.uk/downloads/s4pred/weights.tar.gz
S4PRED_WEIGHTS_MD5=e04ad7d10b61551f7e07a86b65bb88dc

git clone --filter=blob:none "$S4PRED_REPOSITORY" /opt/s4pred
git -C /opt/s4pred checkout --detach "$S4PRED_COMMIT"
curl --fail --location --retry 3 --output /tmp/s4pred-weights.tar.gz "$S4PRED_WEIGHTS_URL"
echo "$S4PRED_WEIGHTS_MD5  /tmp/s4pred-weights.tar.gz" | md5sum --check --strict
tar -xzf /tmp/s4pred-weights.tar.gz -C /opt/s4pred
rm -f /tmp/s4pred-weights.tar.gz
rm -rf /opt/s4pred/.git

python3 -m venv /opt/s4pred-venv
/opt/s4pred-venv/bin/pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.2.2
/opt/s4pred-venv/bin/pip install --no-cache-dir biopython==1.83

test -f /opt/s4pred/run_model.py
test -f /opt/s4pred/weights/weights_1.pt
