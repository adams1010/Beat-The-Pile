#!/usr/bin/env bash
# Runs every offline test (no network, no database — everything is faked). From the repo root: bash tests/run.sh
cd "$(dirname "$0")" || exit 1
fail=0
for f in *-test.mjs; do
  if timeout 150 node "$f" > /tmp/iq-test.out 2>&1; then echo "✓ $f"; else echo "✗ $f"; tail -15 /tmp/iq-test.out; fail=1; fi
done
exit $fail
