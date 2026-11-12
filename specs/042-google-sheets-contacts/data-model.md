# Modelo
sheets_source: organization_id, nombre, spreadsheet_id, sheet_gid, intervalo, enabled, next_sync_at, last_sync_at, status/error/stats, lease token/fecha. Única por empresa/documento/pestaña.
sheets_row: organization_id, source_id, external_key, contact_id nullable, fingerprint, snapshot (teléfono/nombre/email/bloque de notas), timestamps. Única empresa/origen/clave. Ledger y dominio se escriben juntos. Contacto eliminado deja FK null y se omite en siguientes revisiones.
Los valores importados solo reemplazan campos vacíos o iguales al último valor importado. Las notas se anexan en un bloque de origen que se sustituye solo si sigue intacto. Las fuentes no se eliminan desde UI; se pausan.
