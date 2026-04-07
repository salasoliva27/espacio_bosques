#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Espacio Bosques — API Test Script
#
# Exercises the full investment flow end-to-end.
# Requires: curl, jq
#
# Usage:
#   ./scripts/test-api.sh                    # full authenticated flow
#   ./scripts/test-api.sh --sim              # quick sim test (no auth)
#   ./scripts/test-api.sh --state            # dump current state only
#   ./scripts/test-api.sh --reset            # reset sim investments
#
# Demo credentials: demo@bosques.mx / bosques123
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

BACKEND="http://localhost:3001"
SUPABASE_URL="https://rycybujjedtofghigyxm.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5Y3lidWpqZWR0b2ZnaGlneXhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg3Mzk5MiwiZXhwIjoyMDg5NDQ5OTkyfQ.XJ65vlBcHijtVPJS81Bv4_qg61TpkvrwtpbhXOyAako"
DEMO_EMAIL="demo@bosques.mx"
DEMO_PASS="bosques123"
PROJECT_ID="demo-project-001"
MIN_MXN=100

# ── colors ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
info() { echo -e "${CYAN}→${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*"; exit 1; }
hdr()  { echo -e "\n${CYAN}━━ $* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

# ── health check ──────────────────────────────────────────────────────────────
check_backend() {
  hdr "Backend health"
  curl -sf "$BACKEND/health" | jq .
}

# ── dump state ────────────────────────────────────────────────────────────────
dump_state() {
  hdr "Current sim state"
  curl -sf "$BACKEND/api/test/state" | jq '.projects[] | {id, title, fundingPct, raisedEth, investmentCount}'
}

# ── reset ─────────────────────────────────────────────────────────────────────
reset_investments() {
  hdr "Reset sim investments"
  curl -sf -X POST "$BACKEND/api/test/reset" | jq .
  ok "Reset complete"
}

# ── sim (no auth) ─────────────────────────────────────────────────────────────
sim_invest() {
  hdr "Simulated invest (no auth) — ${MIN_MXN} MXN → ${PROJECT_ID}"
  local result
  result=$(curl -sf -X POST "$BACKEND/api/test/invest" \
    -H 'Content-Type: application/json' \
    -d "{\"projectId\": \"$PROJECT_ID\", \"mxn\": $MIN_MXN}")
  echo "$result" | jq .
  ok "Investment recorded via test harness"

  hdr "User investment history (test user)"
  echo "$result" | jq '.userHistory'
}

# ── full authenticated flow ───────────────────────────────────────────────────
authenticated_flow() {
  # 1. Sign in
  hdr "Supabase sign-in (${DEMO_EMAIL})"
  local auth_resp
  auth_resp=$(curl -sf -X POST \
    "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
    -H "apikey: ${ANON_KEY}" \
    -H 'Content-Type: application/json' \
    -d "{\"email\": \"${DEMO_EMAIL}\", \"password\": \"${DEMO_PASS}\"}")
  local TOKEN USER_ID
  TOKEN=$(echo "$auth_resp" | jq -r '.access_token')
  USER_ID=$(echo "$auth_resp" | jq -r '.user.id')
  [[ "$TOKEN" == "null" || -z "$TOKEN" ]] && fail "Auth failed: $(echo "$auth_resp" | jq .)"
  ok "Authenticated as ${USER_ID}"

  # 2. Quote
  hdr "GET /api/invest/quote?mxn=${MIN_MXN}"
  curl -sf "$BACKEND/api/invest/quote?mxn=${MIN_MXN}" | jq .

  # 3. Buy
  hdr "POST /api/invest/buy — ${MIN_MXN} MXN → ${PROJECT_ID}"
  local buy_resp
  buy_resp=$(curl -sf -X POST "$BACKEND/api/invest/buy" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H 'Content-Type: application/json' \
    -d "{\"projectId\": \"${PROJECT_ID}\", \"mxn\": ${MIN_MXN}}")
  echo "$buy_resp" | jq .
  ok "Buy confirmed"

  # 4. Profile investments
  hdr "GET /api/invest/me (user history)"
  curl -sf "$BACKEND/api/invest/me" \
    -H "Authorization: Bearer ${TOKEN}" | jq .

  # 5. State after
  hdr "State after investment"
  curl -sf "$BACKEND/api/test/state" | \
    jq --arg id "$PROJECT_ID" '.projects[] | select(.id == $id) | {fundingPct, raisedEth, investmentCount}'
}

# ── router ────────────────────────────────────────────────────────────────────
check_backend

case "${1:-}" in
  --state)  dump_state ;;
  --reset)  reset_investments ;;
  --sim)    sim_invest ;;
  *)        authenticated_flow ;;
esac

echo ""
ok "Done."
