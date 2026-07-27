#!/bin/bash
# Prueba de migración 009 sobre una copia mínima del formato anterior.
set -uo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
SCHEMA="us22_legacy"
PSQL=(psql -h localhost -p 5433 -U postgres -d vocero -v ON_ERROR_STOP=1 -tA)
export PGPASSWORD=postgres
export PGOPTIONS="-c search_path=$SCHEMA"

cleanup() {
  PGOPTIONS="" "${PSQL[@]}" -c "DROP SCHEMA IF EXISTS $SCHEMA CASCADE" > /dev/null 2>&1
}
trap cleanup EXIT

PGOPTIONS="" "${PSQL[@]}" -c "DROP SCHEMA IF EXISTS $SCHEMA CASCADE; CREATE SCHEMA $SCHEMA" > /dev/null
"${PSQL[@]}" -c "
  CREATE TABLE organization (id text PRIMARY KEY);
  CREATE TABLE pipeline_stage (
    id text PRIMARY KEY,
    organization_id text NOT NULL,
    name text NOT NULL,
    position integer NOT NULL,
    kind text NOT NULL,
    created_at timestamp NOT NULL DEFAULT now()
  );
  CREATE TABLE lead (
    id text PRIMARY KEY,
    organization_id text NOT NULL,
    contact_id text NOT NULL,
    stage_id text NOT NULL,
    position integer NOT NULL DEFAULT 0,
    last_activity_at timestamp,
    follow_up_due_at timestamp,
    follow_up_attempts integer NOT NULL DEFAULT 0,
    closure_reason text,
    closed_at timestamp,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
  );
  INSERT INTO organization VALUES ('org_legacy');
  INSERT INTO pipeline_stage (id, organization_id, name, position, kind) VALUES
    ('s_new','org_legacy','Nuevo',0,'open'),
    ('s_talk','org_legacy','En conversación',1,'open'),
    ('s_interest','org_legacy','Interesado',2,'open'),
    ('s_scheduled','org_legacy','Agendado',3,'scheduled'),
    ('s_follow','org_legacy','Contactar luego',4,'follow_up'),
    ('s_reply','org_legacy','No contestó',5,'no_reply'),
    ('s_won','org_legacy','Cliente',6,'won'),
    ('s_lost','org_legacy','Perdido',7,'lost'),
    ('s_no_interest','org_legacy','No interesado',8,'no_interest'),
    ('s_custom','org_legacy','Cotizado',9,'open');
  INSERT INTO lead (
    id, organization_id, contact_id, stage_id, follow_up_due_at,
    follow_up_attempts, updated_at
  ) VALUES
    ('l_talk','org_legacy','c1','s_talk',NULL,0,'2026-07-01'),
    ('l_interest','org_legacy','c2','s_interest',NULL,0,'2026-07-02'),
    ('l_follow','org_legacy','c3','s_follow','2030-01-01',1,'2026-07-03'),
    ('l_reply','org_legacy','c4','s_reply','2030-01-02',2,'2026-07-04'),
    ('l_no_interest','org_legacy','c5','s_no_interest',NULL,0,'2026-07-05'),
    ('l_lost','org_legacy','c6','s_lost',NULL,0,'2026-07-06'),
    ('l_custom','org_legacy','c7','s_custom',NULL,0,'2026-07-07');
" > /dev/null

apply_data_migration() {
  sed -n '4,$p' "$REPO/drizzle/0015_steep_tempest.sql" | "${PSQL[@]}" > /dev/null
}

echo "── Migración de datos existentes"
apply_data_migration

PASS=0; FAIL=0
ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; echo "     └─ $2"; FAIL=$((FAIL+1)); }
check() { if [ "$2" = "true" ]; then ok "$1"; else bad "$1" "$3"; fi }
Q() { "${PSQL[@]}" -c "$1"; }

NAMES=$(Q "select string_agg(name,'|' order by position) from pipeline_stage")
check "consolida a siete etapas + la personalizada" "$([ "$(Q "select count(*) from pipeline_stage")" = "8" ] && echo true || echo false)" "$NAMES"
check "conserva la etapa personalizada" "$([ "$(Q "select count(*) from pipeline_stage where name='Cotizado'")" = "1" ] && echo true || echo false)" "$NAMES"
check "elimina solo los kinds operativos antiguos" "$([ "$(Q "select count(*) from pipeline_stage where kind in ('follow_up','no_reply','no_interest')")" = "0" ] && echo true || echo false)" "$NAMES"
check "renombra etapas comerciales" "$([ "$(Q "select count(*) from pipeline_stage where name in ('En calificación','Calificado','Cita agendada','No convertido')")" = "4" ] && echo true || echo false)" "$NAMES"
check "seguimientos conservan fecha e intentos" "$([ "$(Q "select count(*) from lead l join pipeline_stage s on s.id=l.stage_id where l.id in ('l_follow','l_reply') and s.name='En calificación' and l.follow_up_due_at is not null and l.follow_up_attempts > 0")" = "2" ] && echo true || echo false)" "$(Q "select id||'|'||stage_id||'|'||coalesce(follow_up_due_at::text,'')||'|'||follow_up_attempts from lead order by id")"
check "No interesado → No convertido/no_response" "$([ "$(Q "select count(*) from lead l join pipeline_stage s on s.id=l.stage_id where l.id='l_no_interest' and s.kind='lost' and l.closure_reason='no_response' and l.closed_at is not null")" = "1" ] && echo true || echo false)" "$(Q "select stage_id||'|'||coalesce(closure_reason,'') from lead where id='l_no_interest'")"
check "Perdido histórico conserva cierre con other" "$([ "$(Q "select closure_reason from lead where id='l_lost'")" = "other" ] && echo true || echo false)" "$(Q "select closure_reason from lead where id='l_lost'")"

echo "── Reejecución idempotente"
BEFORE=$(Q "select string_agg(id||':'||position,'|' order by id) from pipeline_stage")
apply_data_migration
AFTER=$(Q "select string_agg(id||':'||position,'|' order by id) from pipeline_stage")
check "no duplica ni altera posiciones al reejecutar" "$([ "$BEFORE" = "$AFTER" ] && echo true || echo false)" "antes=$BEFORE después=$AFTER"
check "conserva todos los leads" "$([ "$(Q "select count(*) from lead")" = "7" ] && echo true || echo false)" "$(Q "select count(*) from lead")"

echo
echo "══════════════════════════════════"
echo "  RESULTADO: $PASS ok · $FAIL fallos"
echo "══════════════════════════════════"
[ "$FAIL" -eq 0 ]
