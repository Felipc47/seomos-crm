#!/bin/bash
# Self-test de COMPORTAMIENTO — embudo canónico y motivos de cierre (009).
set -uo pipefail

BASE="http://localhost:3000"
JAR="${TMPDIR:-/tmp}/seomos-e2e-etapas.txt"
rm -f "$JAR"
EMAIL="etapas-$(date +%s)@test.local"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
PSQL() { PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d vocero -tA -c "$1" 2>/dev/null; }

echo "── Reset de BD"
PSQL "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;" > /dev/null
(cd "$REPO" && pnpm db:migrate > /dev/null 2>&1)

PASS=0; FAIL=0
ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; echo "     └─ $2"; FAIL=$((FAIL+1)); }
check() { if [ "$2" = "true" ]; then ok "$1"; else bad "$1" "$3"; fi }
has() { [ "$(echo "$1" | grep -c "$2")" -gt 0 ] && echo true || echo false; }

echo "── 1. Organización nueva y embudo canónico"
curl -s -c "$JAR" -X POST "$BASE/api/auth/sign-up/email" \
  -H 'content-type: application/json' \
  -d "{\"name\":\"Tester\",\"email\":\"$EMAIL\",\"password\":\"Password123!\"}" > /dev/null

STAGES=$(curl -s -b "$JAR" "$BASE/api/pipeline/stages")
ORDER=$(PSQL "select string_agg(name,'|' order by position) from pipeline_stage")
check "exactamente siete etapas" "$([ "$(PSQL "select count(*) from pipeline_stage")" = "7" ] && echo true || echo false)" "$STAGES"
check "orden y nombres correctos" "$([ "$ORDER" = "Nuevo|En calificación|Calificado|Cita agendada|Cliente|No calificado|No convertido" ] && echo true || echo false)" "$ORDER"
check "incluye kind unqualified" "$(has "$STAGES" '"kind":"unqualified"')" "$STAGES"
check "sin columnas antiguas de seguimiento" "$([ "$(has "$STAGES" 'Contactar luego')" = "false" ] && [ "$(has "$STAGES" 'No contestó')" = "false" ] && echo true || echo false)" "$STAGES"

echo "── 2. Crear lead y validar cierres negativos"
CONTACT=$(curl -s -b "$JAR" -X POST "$BASE/api/contacts" \
  -H 'content-type: application/json' \
  -d '{"name":"Lead Etapas","phone":"573009998877"}')
CONTACT_ID=$(echo "$CONTACT" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)
LEAD_ID=$(PSQL "select id from lead where contact_id='$CONTACT_ID'")
QUALIFYING_ID=$(PSQL "select id from pipeline_stage where name='En calificación'")
UNQUALIFIED_ID=$(PSQL "select id from pipeline_stage where kind='unqualified'")
LOST_ID=$(PSQL "select id from pipeline_stage where kind='lost'")
check "contacto creó su lead en Nuevo" "$([ -n "$LEAD_ID" ] && [ "$(PSQL "select s.name from lead l join pipeline_stage s on s.id=l.stage_id where l.id='$LEAD_ID'")" = "Nuevo" ] && echo true || echo false)" "$CONTACT"

HTTP=$(curl -s -o /tmp/seomos-us22-response.json -w '%{http_code}' -b "$JAR" \
  -X PATCH "$BASE/api/pipeline/leads/$LEAD_ID" \
  -H 'content-type: application/json' \
  -d "{\"stageId\":\"$UNQUALIFIED_ID\",\"position\":0}")
BODY=$(< /tmp/seomos-us22-response.json)
check "No calificado sin motivo → 422" "$([ "$HTTP" = "422" ] && [ "$(has "$BODY" 'closure_reason_required')" = "true" ] && echo true || echo false)" "$HTTP $BODY"

HTTP=$(curl -s -o /tmp/seomos-us22-response.json -w '%{http_code}' -b "$JAR" \
  -X PATCH "$BASE/api/pipeline/leads/$LEAD_ID" \
  -H 'content-type: application/json' \
  -d "{\"stageId\":\"$UNQUALIFIED_ID\",\"position\":0,\"closureReason\":\"no_response\"}")
check "motivo incompatible → 422" "$([ "$HTTP" = "422" ] && echo true || echo false)" "$HTTP $(< /tmp/seomos-us22-response.json)"

HTTP=$(curl -s -o /tmp/seomos-us22-response.json -w '%{http_code}' -b "$JAR" \
  -X PATCH "$BASE/api/pipeline/leads/$LEAD_ID" \
  -H 'content-type: application/json' \
  -d "{\"stageId\":\"$UNQUALIFIED_ID\",\"position\":0,\"closureReason\":\"no_fit\"}")
check "No calificado con motivo válido → 200" "$([ "$HTTP" = "200" ] && echo true || echo false)" "$HTTP $(< /tmp/seomos-us22-response.json)"
check "persiste motivo y fecha" "$([ "$(PSQL "select closure_reason from lead where id='$LEAD_ID'")" = "no_fit" ] && [ -n "$(PSQL "select closed_at from lead where id='$LEAD_ID'")" ] && echo true || echo false)" "$(PSQL "select closure_reason||'|'||coalesce(closed_at::text,'') from lead where id='$LEAD_ID'")"

echo "── 3. Reabrir limpia el cierre y No convertido usa su catálogo"
curl -s -b "$JAR" -X PATCH "$BASE/api/pipeline/leads/$LEAD_ID" \
  -H 'content-type: application/json' \
  -d "{\"stageId\":\"$QUALIFYING_ID\",\"position\":0}" > /dev/null
check "reabrir limpia motivo y fecha" "$([ "$(PSQL "select count(*) from lead where id='$LEAD_ID' and closure_reason is null and closed_at is null")" = "1" ] && echo true || echo false)" "$(PSQL "select coalesce(closure_reason,'NULL')||'|'||coalesce(closed_at::text,'NULL') from lead where id='$LEAD_ID'")"

HTTP=$(curl -s -o /tmp/seomos-us22-response.json -w '%{http_code}' -b "$JAR" \
  -X PATCH "$BASE/api/pipeline/leads/$LEAD_ID" \
  -H 'content-type: application/json' \
  -d "{\"stageId\":\"$LOST_ID\",\"position\":0,\"closureReason\":\"price\"}")
check "No convertido acepta motivo price" "$([ "$HTTP" = "200" ] && [ "$(PSQL "select closure_reason from lead where id='$LEAD_ID'")" = "price" ] && echo true || echo false)" "$HTTP $(< /tmp/seomos-us22-response.json)"

echo
echo "══════════════════════════════════"
echo "  RESULTADO: $PASS ok · $FAIL fallos"
echo "══════════════════════════════════"
[ "$FAIL" -eq 0 ]
