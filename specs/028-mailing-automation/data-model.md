# Modelo

Toda tabla lleva organization_id NOT NULL con índice org-first. Queries pasan por scoped(), incluso claims y callbacks.

- mailing_sender: PK organization_id, dominio UNIQUE, provider_domain_id, from_email/from_name/reply_to, status, dns_records, last_error, track_opens/track_clicks opcionales.
- mailing_subscriber: id msu_, org/email UNIQUE, name, consent_at, unsubscribed_at, suppressed_at/reason, token opaco UNIQUE. Reimportar nunca limpia bajas/supresiones.
- mailing_list: id mli_, org/name UNIQUE.
- mailing_list_member: id mlm_, org/list/subscriber UNIQUE, created_at.
- mailing_program: id mpr_, kind campaign/sequence, list_id, name, steps JSON validado, status draft/scheduled/active/paused/completed/cancelled, auto_enroll, scheduled_at.
- mailing_enrollment: id men_, org/program/subscriber UNIQUE, started_at, stopped_at. Sin reinscripción implícita.
- mailing_send: id mse_, program/enrollment/subscriber/step, identidad UNIQUE org/program/subscriber/step, due_at, next_attempt_at, first_attempt_at/attempts, lease_until, estado pending/sending/accepted/failed/uncertain/skipped, snapshots inmutables del payload, provider_message_id UNIQUE, timestamps delivered/opened/clicked, outcome.
- mailing_event: id mev_, org/send/provider_event_id UNIQUE, tipo y fecha del proveedor para dedup; sin payload completo.

Campaña: draft → scheduled/active → paused → active; scheduled/active/paused → cancelled; active → completed cuando termina outbox. Secuencia: draft → active ↔ paused → cancelled; pasos inmutables al activar. Envío: pending → sending → accepted/failed/pending/uncertain; lease vencido puede recuperarse dentro de 23h con misma key y mismo payload.
