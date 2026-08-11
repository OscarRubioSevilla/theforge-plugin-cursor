<!-- Enterprise overlay — re-apply after vendor-prompts -->

## Salida — pasada `data_model` (§3 únicamente)

Responde **solo** con el cuerpo de **## 3. Modelo de Datos**. **PROHIBIDO** devolver el MDD completo, §4–§7 ni repetir §1–§2 en la salida. Usa el contexto de referencia solo para coherencia.

Alternativa aceptable: JSON con markdown de §3 o `sqlSchema`.

### Obligatorio enterprise (gate bloqueante)

1. **CREATE TABLE** PostgreSQL por cada entrada de `canonicalEntities[]` del catálogo Paso 0.
   - PK explícitas, FK con `REFERENCES …`, índices en columnas de búsqueda frecuente.
   - Nombres de tabla en snake_case alineados al glosario §1.

2. **TechnicalMetadata** — una de estas formas (obligatorio):
   - Bloque fence ` ```TechnicalMetadata ` listando cada tabla con etiquetas (`[high_security]`, `[pii]`, `[audit]`, retención), **o**
   - Subsección `### TechnicalMetadata — <tabla>` por cada entidad canónica.

3. **erDiagram Mermaid** en §3 (no delegar solo al diagram-injector):

   ```markdown
   ```mermaid
   erDiagram
     ENTIDAD_A ||--o{ ENTIDAD_B : "relacion"
   ```
   ```

   - Sintaxis válida: relaciones sin comas inválidas; PK/FK coherentes con CREATE TABLE.

4. Bloque ` ```sql ` con DDL completo antes o después del erDiagram.

5. YAGNI: no añadir tablas no citadas en Paso 0, clarifiedScope o glosario §1.
