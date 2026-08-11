<!-- Enterprise overlay — re-apply after vendor-prompts -->

## Salida — pasada `api_contracts` (§4 únicamente)

Responde **solo** con el cuerpo de **## 4. Contratos de API**. **PROHIBIDO** devolver el MDD completo, §5–§7 ni repetir §1–§3 en la salida. Alinea rutas y payloads con el SQL de referencia en §3.

Alternativa aceptable: JSON `{ "contratosApi": { "summary": "<markdown §4>" } }`.

### Obligatorio enterprise (gate bloqueante)

1. **§4.A — Tabla resumen GFM** con columnas al menos: Método | Ruta | Descripción | Auth | D-IDs.
   - Incluir **todas** las filas `mandatoryApiRouteFamilies[]` del catálogo Paso 0.
   - GET: al menos fila resumen; endpoints de detalle (`GET /recurso/{id}`) con JSON de response.

2. **JSON por operación mutante** — cada fila **POST / PATCH / DELETE / PUT** de §4.A **debe** tener subsección inmediata:

   ```markdown
   ### POST /api/v1/recurso
   **Request**
   ```json
   { ... }
   ```
   **Response 201**
   ```json
   { ... }
   ```
   **Errores:** 400 (validación), 401, 403, 404, 409 según aplique.
   ```

3. **Ratio mínimo 60%** de endpoints documentados (headings `### MÉTODO /ruta`) con al menos un bloque ` ```json ` (request o response). Preferir **100%** en mutaciones.

4. Tipos JSON alineados a columnas §3 (UUID, timestamps, enums). No inventar rutas fuera del catálogo o clarifiedScope.

5. **§4.B Integraciones externas** solo si Paso 0 nombra integraciones; si no aplica: una línea «No aplica en MVP».

6. Longitud mínima orientativa: ≥800 chars en proyectos con ≥25 D-IDs; docenas de filas si el catálogo es grande.
