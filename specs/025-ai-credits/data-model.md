# Data Model: Créditos de IA por empresa

## `ai_credit_account`

Una fila por organización.

| Campo | Regla |
|---|---|
| `organization_id` | PK, FK a organización con cascade, tenant obligatorio |
| `balance` | entero, NOT NULL, default 0, check `>= 0` |
| `total_granted` | entero, NOT NULL, default 0, check `>= 0` |
| `total_used` | entero, NOT NULL, default 0, check `>= 0` |
| `updated_at` | timestamp NOT NULL |

Invariantes:

- `balance` nunca es negativo.
- Solo los consumos incrementan `total_used`.
- Las recargas positivas incrementan `total_granted`.

## `ai_credit_entry`

Libro append-only de movimientos.

| Campo | Regla |
|---|---|
| `id` | PK con prefijo `aic_` |
| `organization_id` | FK a organización con cascade, NOT NULL, indexado primero |
| `delta` | entero distinto de 0; positivo para recarga, negativo para consumo |
| `kind` | `admin_grant`, `initial_grant`, `migration_grant`, `agent_turn`, `follow_up` |
| `reference_key` | texto NOT NULL, único junto con organización |
| `actor_user_id` | FK nullable a usuario; presente en recarga manual |
| `created_at` | timestamp NOT NULL |

Invariantes:

- `(organization_id, reference_key)` es único.
- Los movimientos no se actualizan ni eliminan individualmente.
- Un consumo duplicado no altera saldo ni totales.

## Referencias de consumo

- Intervención: `agent-turn:{conversationId}:{lastInboundMessageId}`.
- Seguimiento: `follow-up:{leadId}:{attemptNumber}`.
- Recarga: `admin-grant:{entryId}`.

## Transiciones

```text
Recarga: balance += amount; total_granted += amount; entry.delta = +amount
Consumo: si balance >= amount → balance -= amount; total_used += amount; entry.delta = -amount
Insuficiente: rollback completo; no queda movimiento ni saldo parcial
Duplicado: operación exitosa sin nuevo movimiento ni cambio de saldo
```
