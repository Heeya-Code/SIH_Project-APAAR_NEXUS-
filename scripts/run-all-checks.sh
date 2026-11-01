#!/usr/bin/env bash
# One command for every automated check. Starts a FRESH production server for each suite, because the
# login rate limiter (30 attempts per IP per 10 minutes) and the verification-API quota are in-memory and
# would otherwise be shared between suites. Requires: seeded database, `npm run build` output is created here.
#   bash scripts/run-all-checks.sh            (browser/axe suites are skipped if Python Playwright is missing)
#   PART=server bash scripts/run-all-checks.sh   only typecheck, build, unit tests and the server-side suites
#   PART=browser bash scripts/run-all-checks.sh  only the accessibility and browser suites (needs a built app)
set -u
cd "$(dirname "$0")/.."
PART="${PART:-all}"
PASS=0; FAILED=()
step() { local name="$1"; shift; echo; echo "=== $name ==="; if "$@"; then PASS=$((PASS+1)); else FAILED+=("$name"); fi; }
serve() { DEMO_MODE=true node node_modules/next/dist/bin/next start -p 3000 >/tmp/nexus-next.log 2>&1 & SERVER=$!; for _ in $(seq 1 40); do curl -s -o /dev/null http://localhost:3000/login && return 0; sleep 1; done; echo "server did not start"; return 1; }
stop() { kill "$SERVER" 2>/dev/null; wait "$SERVER" 2>/dev/null; }
suite() { local name="$1"; shift; echo; echo "=== $name (fresh server) ==="; serve || { FAILED+=("$name"); return; }; if "$@"; then PASS=$((PASS+1)); else FAILED+=("$name"); fi; stop; }

if [ "$PART" != "browser" ]; then
step "typecheck" npx tsc --noEmit
step "production build" npx next build
step "unit tests" npm test --silent
suite "server-side: Phase 1 regression" npm run --silent verify:stage1
suite "server-side: roles, sidebar, charts, seat ledger, verification API" npm run --silent verify:closeout
step "service layer: upload pipeline, five checks, consent, signed records, trust, audit" npm run --silent verify:phase2
fi
if [ "$PART" != "server" ] && python3 -c "import playwright" 2>/dev/null; then
  suite "accessibility (axe-core, WCAG 2.0/2.1 A+AA)" python3 scripts/a11y-axe.py
  suite "browser: role flows, sidebar links, charts" python3 scripts/browser-closeout.py
  suite "browser: UI interactions" python3 scripts/browser-ui.py
  suite "browser: DEMO A upload and validation, DEMO B command centre, DEMO C consent and QR" python3 scripts/browser-demos.py "${DEMO_SHOTS:-docs/screenshots/demo-flows}"
else echo; echo "(Python Playwright not installed: accessibility and browser suites skipped)"; fi

echo; echo "------------------------------------------------------------"
echo "steps passed: $PASS   failed: ${#FAILED[@]}"; for f in "${FAILED[@]}"; do echo "  FAILED: $f"; done
[ ${#FAILED[@]} -eq 0 ]
