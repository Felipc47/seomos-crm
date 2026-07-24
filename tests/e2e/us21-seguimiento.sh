#!/bin/bash
# Self-test de COMPORTAMIENTO — Seguimiento automático (008).
# Flujo A: el cliente pide que lo contacten luego → «Contactar luego» →
#   2 intentos (12h / +1 día hábil, ventana de atención) → «No interesado».
# Flujo B: nadie responde al primer mensaje (campaña) → «No contestó» →
#   misma rutina con plantilla (ventana de 24h cerrada).
# Camino infeliz: sin plantilla configurada los intentos fuera de ventana se
#   omiten con nota, y la rutina avanza sin colgarse.
#
# Corre contra `pnpm dev` con mocks y AGENT_SWEEP_SECRET=e2e-sweep (ver us21 .md).
set -uo pipefail

BASE="http://localhost:3000"
JAR="${TMPDIR:-/tmp}/seomos-e2e-seguimiento.txt"
rm -f "$JAR"
EMAIL="seg-$(date +%s)@test.local"
WABA="waba_test_1"; PHONE="phone_test_1"; TOKEN="EAAtest-valido"
SWEEP="${AGENT_SWEEP_SECRET:-e2e-sweep}"
C1="573001110001"; C2="573001110002"; C3="573001110003"; C4="573001110004"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
PSQL() { PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d vocero -tA -c "$1" 2>/dev/null; }

echo "── Reset de BD y mocks"
PSQL "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;" > /dev/null
(cd "$REPO" && pnpm db:migrate > /dev/null 2>&1)
curl -s -X DELETE "$BASE/api/dev/wa-mock/outbox" > /dev/null

PASS=0; FAIL=0
ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; echo "     └─ $2"; FAIL=$((FAIL+1)); }
check() { if [ "$2" = "true" ]; then ok "$1"; else bad "$1" "$3"; fi }
has() { [ "$(echo "$1" | grep -c "$2")" -gt 0 ] && echo true || echo false; }

say() { # say <telefono> <nombre> <texto-json>
  curl -s -X POST "$BASE/api/dev/wa-mock/inbound" -H 'content-type: application/json' \
    -d "{\"phoneNumberId\":\"$PHONE\",\"from\":\"$1\",\"name\":\"$2\",\"text\":$3}" > /dev/null
}
sweep() { # sweep <now-iso>  (viaje en el tiempo, solo mocks)
  curl -s "$BASE/api/cron/sweep?now=$1" -H "Authorization: Bearer $SWEEP"
}
due_of() { PSQL "select to_char(l.follow_up_due_at,'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') from lead l join contact c on c.id=l.contact_id where c.phone='$1'"; }
attempts_of() { PSQL "select l.follow_up_attempts from lead l join contact c on c.id=l.contact_id where c.phone='$1'"; }
kind_of() { PSQL "select s.kind from lead l join contact c on c.id=l.contact_id join pipeline_stage s on s.id=l.stage_id where c.phone='$1'"; }
stage_of() { PSQL "select s.name from lead l join contact c on c.id=l.contact_id join pipeline_stage s on s.id=l.stage_id where c.phone='$1'"; }
notes_of() { PSQL "select coalesce(notes,'') from contact where phone='$1'"; }
outbox_to() { curl -s "$BASE/api/dev/wa-mock/outbox" | tr '{' '\n' | grep -c "\"to\":\"$1\""; }
plus() { python3 -c "from datetime import datetime,timedelta;print((datetime.fromisoformat('$1'.replace('Z','+00:00'))+timedelta(seconds=$2)).strftime('%Y-%m-%dT%H:%M:%SZ'))"; }

echo "── 0. Registro, WhatsApp y agente (mocks)"
curl -s -c "$JAR" -X POST "$BASE/api/auth/sign-up/email" -H 'content-type: application/json' \
  -d "{\"name\":\"Tester\",\"email\":\"$EMAIL\",\"password\":\"Password123!\"}" > /dev/null
curl -s -b "$JAR" -c "$JAR" -X PUT "$BASE/api/settings/whatsapp" -H 'content-type: application/json' \
  -d "{\"wabaId\":\"$WABA\",\"phoneNumberId\":\"$PHONE\",\"token\":\"$TOKEN\"}" > /dev/null
curl -s -b "$JAR" -X PUT "$BASE/api/agent/profile" -H 'content-type: application/json' \
  -d '{"enabled":true,"name":"Ana"}' > /dev/null

BOARD=$(curl -s -b "$JAR" "$BASE/api/pipeline/board")
check "el tablero muestra «Contactar luego»" "$(has "$BOARD" 'Contactar luego')" "$BOARD"
check "el tablero muestra «No contestó»" "$(has "$BOARD" 'No contestó')" "$BOARD"
check "el tablero muestra «No interesado»" "$(has "$BOARD" 'No interesado')" "$BOARD"

echo "── 1. Flujo A: el cliente pide que lo contacten luego (SIN plantilla configurada)"
say "$C1" "Cliente Luego" '"Hola, me interesa una página web para mi negocio"'
sleep 4
say "$C1" "Cliente Luego" '"Ahora no puedo seguir, escríbeme más tarde por favor"'
sleep 5
check "lead en etapa «Contactar luego»" "$([ "$(kind_of $C1)" = "follow_up" ] && echo true || echo false)" "stage=$(stage_of $C1) kind=$(kind_of $C1)"
DUE1=$(due_of "$C1")
check "primer intento programado (~12h, ventana de atención)" "$([ -n "$DUE1" ] && echo true || echo false)" "due=$DUE1"
CONV_MSGS=$(PSQL "select string_agg(text,' | ') from message m join conversation v on v.id=m.conversation_id join contact c on c.id=v.contact_id where c.phone='$C1' and m.direction='out'")
check "el agente se despidió confirmando el seguimiento" "$(has "$CONV_MSGS" 'Te escribo más adelante')" "$CONV_MSGS"

echo "── 2. Intento 1 vencido: sin plantilla y fuera de ventana → se omite con nota"
OUT_C1_BEFORE=$(outbox_to "$C1")
R=$(sweep "$(plus "$DUE1" 60)")
check "el barrido respondió ok" "$(has "$R" '"ok":true')" "$R"
check "attempts=1 (la rutina avanza)" "$([ "$(attempts_of $C1)" = "1" ] && echo true || echo false)" "attempts=$(attempts_of $C1)"
DUE2=$(due_of "$C1")
check "reprogramado +1 día hábil" "$([ -n "$DUE2" ] && [ "$DUE2" \> "$DUE1" ] && echo true || echo false)" "due1=$DUE1 due2=$DUE2"
check "NO se envió nada (ventana cerrada, sin plantilla)" "$([ "$(outbox_to $C1)" = "$OUT_C1_BEFORE" ] && echo true || echo false)" "outbox=$(outbox_to $C1)"
check "quedó nota de la omisión" "$(has "$(notes_of $C1)" 'plantilla de seguimiento')" "$(notes_of $C1)"

echo "── 3. Intento 2 y cierre → «No interesado»"
R=$(sweep "$(plus "$DUE2" 60)")
DUE3=$(due_of "$C1")
check "attempts=2 tras el segundo intento" "$([ "$(attempts_of $C1)" = "2" ] && echo true || echo false)" "attempts=$(attempts_of $C1)"
R=$(sweep "$(plus "$DUE3" 60)")
check "cerró en «No interesado»" "$([ "$(kind_of $C1)" = "no_interest" ] && echo true || echo false)" "stage=$(stage_of $C1)"
check "rutina desarmada (due nulo)" "$([ -z "$(due_of $C1)" ] && echo true || echo false)" "due=$(due_of $C1)"
check "nota del cierre en la ficha" "$(has "$(notes_of $C1)" 'No interesado')" "$(notes_of $C1)"

echo "── 4. Flujo A con hora dicha por el cliente («en dos horas») → mensaje del LLM si hay ventana"
say "$C2" "Cliente Dos Horas" '"¿Me escribes en dos horas? ahora no puedo"'
sleep 5
check "lead C2 en «Contactar luego»" "$([ "$(kind_of $C2)" = "follow_up" ] && echo true || echo false)" "stage=$(stage_of $C2)"
DUE_C2=$(due_of "$C2")
IN_WINDOW=$(python3 -c "
from datetime import datetime,timezone,timedelta
due=datetime.fromisoformat('$DUE_C2'.replace('Z','+00:00'))
print('true' if due < datetime.now(timezone.utc)+timedelta(hours=24) else 'false')")
if [ "$IN_WINDOW" = "true" ]; then
  sweep "$(plus "$DUE_C2" 60)" > /dev/null
  C2_OUT=$(PSQL "select string_agg(text,' | ') from message m join conversation v on v.id=m.conversation_id join contact c on c.id=v.contact_id where c.phone='$C2' and m.direction='out'")
  check "intento en ventana: mensaje contextual del LLM" "$(has "$C2_OUT" 'retomar nuestra conversación')" "$C2_OUT"
  check "attempts C2 = 1" "$([ "$(attempts_of $C2)" = "1" ] && echo true || echo false)" "$(attempts_of $C2)"
else
  echo "  ⚠️  due de C2 quedó fuera de la ventana de 24h (test corrido fuera de horario laboral): rama LLM no ejercitada"
fi

echo "── 5. La respuesta del cliente CANCELA la rutina"
say "$C3" "Cliente Vuelve" '"Ahora no puedo, hablamos más tarde"'
sleep 5
check "lead C3 armado en «Contactar luego»" "$([ "$(kind_of $C3)" = "follow_up" ] && echo true || echo false)" "stage=$(stage_of $C3)"
say "$C3" "Cliente Vuelve" '"Listo, ya volví. ¿Seguimos?"'
sleep 5
check "rutina cancelada al responder (due nulo)" "$([ -z "$(due_of $C3)" ] && echo true || echo false)" "due=$(due_of $C3)"
check "el lead volvió a «En conversación»" "$([ "$(stage_of $C3)" = "En conversación" ] && echo true || echo false)" "stage=$(stage_of $C3)"

echo "── 6. Plantilla de seguimiento aprobada + configuración"
curl -s -b "$JAR" -X POST "$BASE/api/templates" -H 'content-type: application/json' \
  -d '{"name":"seguimiento_ping","language":"es_CO","category":"UTILITY","body":"Hola {{1}}, ¿seguimos con tu cotización?"}' > /dev/null
curl -s -X POST "$BASE/api/dev/wa-mock/template-status" -H 'content-type: application/json' \
  -d "{\"wabaId\":\"$WABA\",\"name\":\"seguimiento_ping\",\"language\":\"es_CO\",\"event\":\"APPROVED\"}" > /dev/null
curl -s -b "$JAR" -X POST "$BASE/api/templates/sync" > /dev/null
TPL_ID=$(curl -s -b "$JAR" "$BASE/api/templates" | tr '{' '\n' | grep 'seguimiento_ping' | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)
CFG=$(curl -s -b "$JAR" -X PUT "$BASE/api/settings/follow-up" -H 'content-type: application/json' \
  -d "{\"enabled\":true,\"templateId\":\"$TPL_ID\"}")
check "plantilla de seguimiento configurada" "$(has "$CFG" '"ok":true')" "$CFG"

echo "── 7. Flujo B: primer mensaje (campaña) sin respuesta → «No contestó» + plantilla"
curl -s -b "$JAR" -X POST "$BASE/api/contacts" -H 'content-type: application/json' \
  -d "{\"name\":\"Frio Cuatro\",\"phone\":\"$C4\"}" > /dev/null
C4_ID=$(PSQL "select id from contact where phone='$C4'")
curl -s -b "$JAR" -X PATCH "$BASE/api/contacts/$C4_ID" -H 'content-type: application/json' \
  -d '{"consentGranted":true}' > /dev/null
CMP=$(curl -s -b "$JAR" -X POST "$BASE/api/campaigns" -H 'content-type: application/json' \
  -d "{\"name\":\"Primer contacto\",\"templateId\":\"$TPL_ID\",\"variableMode\":\"contact_name\",\"audience\":{\"mode\":\"all\"}}")
CMP_ID=$(echo "$CMP" | sed -n 's/.*"id":"\(cmp_[^"]*\)".*/\1/p' | head -1)
curl -s -b "$JAR" -X POST "$BASE/api/campaigns/$CMP_ID/start" > /dev/null
for _ in $(seq 1 30); do
  ST=$(curl -s -b "$JAR" "$BASE/api/campaigns/$CMP_ID" | sed -n 's/.*"status":"\([a-z]*\)".*/\1/p' | head -1)
  [ "$ST" = "done" ] && break; sleep 1
done
check "campaña enviada (primer mensaje a C4)" "$([ "$(outbox_to $C4)" -ge 1 ] && echo true || echo false)" "st=$ST outbox=$(outbox_to $C4)"
check "C4 sigue en «Nuevo» (aún sin rutina)" "$([ "$(stage_of $C4)" = "Nuevo" ] && echo true || echo false)" "stage=$(stage_of $C4)"

NOW_B=$(python3 -c "
from datetime import datetime,timezone,timedelta
t=datetime.now(timezone.utc)+timedelta(hours=12,minutes=5)
local=t-timedelta(hours=5)  # Bogotá
while local.weekday()>=5 or local.hour<9 or (local.hour,local.minute)>=(17,30):
    local=(local+timedelta(days=1)).replace(hour=9,minute=5,second=0)
print((local+timedelta(hours=5)).strftime('%Y-%m-%dT%H:%M:%SZ'))")
OUT_C4_BEFORE=$(outbox_to "$C4")
R=$(sweep "$NOW_B")
check "el barrido detectó el silencio (entered≥1)" "$(has "$R" '"entered":1')" "$R"
check "C4 pasó a «No contestó»" "$([ "$(kind_of $C4)" = "no_reply" ] && echo true || echo false)" "stage=$(stage_of $C4)"
check "intento 1 enviado con la PLANTILLA (ventana cerrada)" "$([ "$(outbox_to $C4)" -gt "$OUT_C4_BEFORE" ] && echo true || echo false)" "outbox=$(outbox_to $C4)"
check "attempts C4 = 1" "$([ "$(attempts_of $C4)" = "1" ] && echo true || echo false)" "$(attempts_of $C4)"

echo "── 8. Intento 2 con plantilla y cancelación por respuesta"
DUE_C4=$(due_of "$C4")
OUT_C4_BEFORE=$(outbox_to "$C4")
sweep "$(plus "$DUE_C4" 60)" > /dev/null
check "intento 2 enviado con plantilla" "$([ "$(outbox_to $C4)" -gt "$OUT_C4_BEFORE" ] && echo true || echo false)" "outbox=$(outbox_to $C4)"
check "attempts C4 = 2" "$([ "$(attempts_of $C4)" = "2" ] && echo true || echo false)" "$(attempts_of $C4)"
say "$C4" "Frio Cuatro" '"Hola, sí me interesa, cuéntame más"'
sleep 5
check "al responder, la rutina de C4 muere (due nulo)" "$([ -z "$(due_of $C4)" ] && echo true || echo false)" "due=$(due_of $C4)"
check "C4 volvió a «En conversación»" "$([ "$(stage_of $C4)" = "En conversación" ] && echo true || echo false)" "stage=$(stage_of $C4)"

echo ""
echo "══════════════════════════════════"
echo "  RESULTADO: $PASS ok · $FAIL fallos"
echo "══════════════════════════════════"
[ "$FAIL" -eq 0 ]
