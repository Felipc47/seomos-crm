# API Contracts: Créditos de IA

## `GET /api/admin/companies`

Solo superadmin. Cada elemento de `companies` agrega:

```json
{
  "aiCredits": {
    "balance": 500,
    "totalGranted": 1000,
    "totalUsed": 500
  }
}
```

Si una instalación antigua no tiene cuenta, devuelve ceros.

## `POST /api/admin/companies/{id}/credits`

Solo superadmin. La empresa debe existir y estar activa.

Request:

```json
{ "amount": 500 }
```

`amount` es entero entre 1 y 100.000.

Response `200`:

```json
{
  "credits": {
    "balance": 1000,
    "totalGranted": 1500,
    "totalUsed": 500
  }
}
```

Errores: `403 forbidden`, `404 not_found`, `409 company_deleted`, `422 invalid_body`.

## `GET /api/agent/profile`

Para roles que ya pueden configurar el agente, agrega:

```json
{
  "credits": {
    "balance": 500,
    "agentTurnCost": 1,
    "followUpCost": 1
  }
}
```

## Rutas históricas `/api/lab/*`

La función fue retirada. No hay handlers bajo `/api/lab/*`; cualquier método
devuelve el 404 estándar de Next.js, sin consultar la base de datos ni invocar
el proveedor de IA.
