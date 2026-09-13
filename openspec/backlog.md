# Backlog — Future Improvements

Ideas que NO están en el scope actual pero valen la pena considerar
cuando el MVP esté en uso. Cada item tiene: contexto, approach
propuesto, trigger para retomarlo, estimated effort.

Orden recomendado: **B → A → maybe C**.

---

## B. Bank-Pattern Classifier (post-FR-3, pre-rules-editor)

### Context

Después de FR-3, los CSV reales del Santander ingieren correctamente,
pero los merchants desconocidos caen todos en `wants/variables` porque
las keyword rules son escasas (7 seeds hardcoded en `defaultRules.ts`).
UX: la data está correcta pero visualmente no informativa. El usuario ve
"Compra Decathlon" → Variables en vez de poder distinguir subscripciones
de gastos variables de compras one-off.

### Approach: bank-pattern recognition (deterministic)

Agregar `detectShape(description, amount)` en `src/lib/classification/`
que mapea los patterns del Santander a categorías, ANTES del sign-fallback:

| Pattern (case-insensitive prefix) | Amount sign | → Category |
| --- | --- | --- |
| `Compra X` | any | `wants/variables` |
| `Pago Movil En X` | any | `wants/variables` |
| `Transferencia De X` | positive | `income/salary` |
| `Transferencia De X` | negative | `wants/variables` |
| `Retirada De Efectivo` | any | `wants/variables` |
| `Compra X (Comision Y)` | any | `wants/variables` |
| `Pago Recibido De X` | any | `income/salary` |
| unknown | any | sign-fallback (current behavior) |

El pattern del banco ES la regla. No requiere learning, no tiene
cold start, 100% determinístico, trivialmente testeable.

### Why this over auto-learning (Option C)

- **No cold start**: funciona desde el primer CSV
- **Sin estado persistente**: no hay archivo `rules.json` ni DB que mantener
- **Trivially testable**: `detectShape("Compra Netflix", -15.99)` → `{kind:'card_purchase'}`
- **Bank patterns ARE the rule**: el Santander usa consistentemente estos prefijos — no es un proxy

### Trade-off vs more granular subcategories

Mantener `wants/variables` como bucket default (no propagar a
`wants/shopping` / `wants/subscriptions`). Esto es deliberado para MVP:

- Subcategories específicas requieren reglas adicionales por merchant
- Eso es el scope de A (rules editor) o futuro
- B es el paso inmediato: que `Variables` no sea el "cajón de sastre"
  sino que refleje la naturaleza del gasto (compra vs transferencia vs retirada)

### Trigger para implementar

Cuando el usuario haya ingested 3+ CSVs del Santander y encuentre el
bucket `Variables` difícil de navegar.

### Estimated effort

**S** (small). Un módulo nuevo (`bankPatterns.ts` + tests, ~50 LOC +
~10 scenarios T-15). Modificación de `classify.ts` para usar el wrapper.

---

## A. Rules Editor UI (original Q5)

### Context

`defaultRules.ts` requiere editar código para agregar merchants. El
usuario pidió UI en Q5; diferido para MVP.

### Approach

- Persistir reglas en `data/state/rules.json` (nuevo archivo, ignorado por git)
- Página nueva `/rules` con table editor: keyword, tier, subcategory
- Apply rules on next ingest
- Validación contra frozen `WantsSubcategory` union (T8 reversal)

### Components

- `src/lib/engine/loadRules.ts` — lee `data/state/rules.json` con fallback a `DEFAULT_SUBRULES`
- `src/lib/engine/saveRules.ts` — persiste rules tras edición
- `src/app/actions/updateRule.ts` — Server Action para CRUD
- `src/app/rules/page.tsx` — UI table editor
- `src/components/RuleEditor.tsx` — fila editable (tier select + subcategory select + delete button)

### Trigger

Después de que B (bank-pattern) esté en uso Y el usuario pregunte
"¿por qué DECATHLON no está en shopping?" → es el momento de A.

### Estimated effort

**M** (medium). 1 módulo nuevo, 1 Server Action, 1 página, 1 componente,
~30 tests. Cambia el flujo de ingest (load en vez de import estático).

---

## C. Auto-Learning Classifier (speculative)

### Context

Si el usuario usa múltiples bancos (Sabadell, BBVA, CaixaBank) Y quiere
que el clasificador mejore de los datos observados sin editar reglas
manualmente.

### Approach

- Después de cada ingest, cluster descriptions por similitud
- Proponer reglas nuevas basadas en frequency + amount sign
- Usuario revisa + acepta en "Rule Suggestions" panel

### Why deferred

- **Cold start problem**: primer CSV sigue cayendo en Variables
- **Persistent state**: ¿`rules.json`? ¿DB? ¿donde se persisten las sugerencias?
- **Non-deterministic behavior**: tests dependen del history de inputs
- **Wrong associations compound**: una mala asociación se queda para siempre
- **UI for corrections**: back to needing a rules editor (overlap con A)

### Trigger

Si rules editor (A) resulta insuficiente después de 6 meses de uso
con múltiples bancos.

### Estimated effort

**L** (large). Nuevo inference module, storage layer, suggestion UI.

---

## Other ideas (parking lot)

- **Multi-bank support**: otros bancos españoles (Sabadell, BBVA, CaixaBank) — patterns diferentes. Defer hasta que se necesite.
- **Debit/credit explicit detection**: actualmente solo manejamos `+/-`. Algunos bancos distinguen explícitamente. Defer.
- **Date heuristics for "value vs booking"**: ya resuelto en FR-3 con value-date preference. Closed.
- **Currency auto-detection**: actualmente single currency per ingest. Defer.
- **Real-time exchange rates**: out of scope (local-first, no API deps).
