#!/bin/bash
# SHRANIX Settings Hub — API QA (all 8 sections)
BASE="http://localhost:4001/api/v1"
JAR=/tmp/qa-cookies.txt
rm -f "$JAR"

echo "═══ LOGIN ═══"
LOGIN=$(curl -s -m 10 -c "$JAR" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@shranix.com","password":"admin123"}')
echo "Raw login (first 150 chars): $(echo "$LOGIN" | head -c 150)"
echo ""

TOKEN=$(echo "$LOGIN" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).data?.tokens?.accessToken||'')}catch(e){console.log('')}})")
if [ -z "$TOKEN" ]; then
  echo "❌ LOGIN FAILED — no token. Can't continue."
  exit 1
fi
echo "✅ Token: ${TOKEN:0:25}..."
CSRF=$(grep csrf_token "$JAR" | awk '{print $NF}')
echo "CSRF cookie: ${CSRF:0:15}..."

AUTH="Authorization: Bearer $TOKEN"
CSRF_H="x-csrf-token: $CSRF"
CT="Content-Type: application/json"

pass=0; fail=0
report() { # name code body
  if [ "$2" = "200" ] || [ "$2" = "201" ]; then
    echo "  ✅ [$2] $1"
    pass=$((pass+1))
  else
    echo "  ❌ [$2] $1 — $(echo "$3" | head -c 150)"
    fail=$((fail+1))
  fi
}

echo ""
echo "═══ 1. FINANCIAL SETTINGS ═══"
B=$(curl -s -m 10 -o /tmp/q1 -w '%{http_code}' "$BASE/finance/settings" -H "$AUTH"); report "GET /finance/settings" "$B" "$(cat /tmp/q1)"
echo "     → $(head -c 200 /tmp/q1 | tr '\n' ' ')"

echo "═══ 2. ROLES & PERMISSIONS ═══"
B=$(curl -s -m 10 -o /tmp/q2 -w '%{http_code}' "$BASE/roles?page=1&pageSize=5" -H "$AUTH"); report "GET /roles" "$B" "$(cat /tmp/q2)"
echo "     → $(head -c 200 /tmp/q2 | tr '\n' ' ')"

echo "═══ 3. PRINTER SETTINGS ═══"
B=$(curl -s -m 10 -o /tmp/q3 -w '%{http_code}' "$BASE/printer/settings" -H "$AUTH"); report "GET /printer/settings" "$B" "$(cat /tmp/q3)"
echo "     → $(head -c 200 /tmp/q3 | tr '\n' ' ')"

echo "═══ 4. NOTIFICATION SETTINGS ═══"
B=$(curl -s -m 10 -o /tmp/q4 -w '%{http_code}' "$BASE/notifications/settings" -H "$AUTH"); report "GET /notifications/settings" "$B" "$(cat /tmp/q4)"
echo "     → $(head -c 200 /tmp/q4 | tr '\n' ' ')"

echo "═══ 5. DATA MANAGEMENT ═══"
B=$(curl -s -m 10 -o /tmp/q5a -w '%{http_code}' "$BASE/data-management/meta" -H "$AUTH"); report "GET /data-management/meta" "$B" "$(cat /tmp/q5a)"
echo "     → $(head -c 200 /tmp/q5a | tr '\n' ' ')"
B=$(curl -s -m 10 -o /tmp/q5b -w '%{http_code}' "$BASE/data-management/deleted" -H "$AUTH"); report "GET /data-management/deleted" "$B" "$(cat /tmp/q5b)"
echo "     → $(head -c 200 /tmp/q5b | tr '\n' ' ')"

echo "═══ 6. AUDIT TRAIL ═══"
B=$(curl -s -m 10 -o /tmp/q6 -w '%{http_code}' "$BASE/audit-trail?page=1&pageSize=5" -H "$AUTH"); report "GET /audit-trail" "$B" "$(cat /tmp/q6)"
echo "     → $(head -c 200 /tmp/q6 | tr '\n' ' ')"

echo "═══ 7. LICENSE ═══"
B=$(curl -s -m 10 -o /tmp/q7 -w '%{http_code}' "$BASE/license" -H "$AUTH"); report "GET /license" "$B" "$(cat /tmp/q7)"
echo "     → $(head -c 200 /tmp/q7 | tr '\n' ' ')"

echo "═══ 8. API SETTINGS (settings + webhooks + api-keys) ═══"
B=$(curl -s -m 10 -o /tmp/q8a -w '%{http_code}' "$BASE/integrations/settings" -H "$AUTH"); report "GET /integrations/settings" "$B" "$(cat /tmp/q8a)"
echo "     → $(head -c 200 /tmp/q8a | tr '\n' ' ')"
B=$(curl -s -m 10 -o /tmp/q8b -w '%{http_code}' "$BASE/integrations/webhooks" -H "$AUTH"); report "GET /integrations/webhooks" "$B" "$(cat /tmp/q8b)"
echo "     → $(head -c 200 /tmp/q8b | tr '\n' ' ')"
B=$(curl -s -m 10 -o /tmp/q8c -w '%{http_code}' "$BASE/integrations/api-keys" -H "$AUTH"); report "GET /integrations/api-keys" "$B" "$(cat /tmp/q8c)"
echo "     → $(head -c 200 /tmp/q8c | tr '\n' ' ')"

echo ""
echo "═══════ WRITE TESTS (CSRF-enabled) ═══════"
# Create + delete a webhook (functional round-trip)
B=$(curl -s -m 10 -o /tmp/qw1 -w '%{http_code}' -X POST "$BASE/integrations/webhooks" \
  -H "$AUTH" -H "$CSRF_H" -H "$CT" -b "$JAR" \
  -d '{"name":"qa-hook","url":"http://localhost:9999/hook","events":"invoice.created","isActive":true}')
report "POST /integrations/webhooks (create)" "$B" "$(cat /tmp/qw1)"
HOOK_ID=$(node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).data?.id||JSON.parse(d).id||'')}catch(e){console.log('')}})" < /tmp/qw1)
if [ -n "$HOOK_ID" ]; then
  B=$(curl -s -m 10 -o /tmp/qw2 -w '%{http_code}' -X DELETE "$BASE/integrations/webhooks/$HOOK_ID" -H "$AUTH" -H "$CSRF_H" -b "$JAR")
  report "DELETE /integrations/webhooks/$HOOK_ID (cleanup)" "$B" "$(cat /tmp/qw2)"
else
  echo "  ⚠ no hook id to clean up"
fi

# Notification settings PUT (round-trip — keep existing values)
B=$(curl -s -m 10 -o /tmp/qw3 -w '%{http_code}' -X PUT "$BASE/notifications/settings" \
  -H "$AUTH" -H "$CSRF_H" -H "$CT" -b "$JAR" -d '{"smsEnabled":true}')
report "PUT /notifications/settings" "$B" "$(cat /tmp/qw3)"
echo "     → $(head -c 200 /tmp/qw3 | tr '\n' ' ')"

echo ""
echo "═══════ RESULT: $pass passed / $fail failed ═══════"
