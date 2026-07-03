# Motor de prestaciones laborales (Honduras) — alineación STSS

Documento técnico del motor de liquidación implementado en `lib/payroll/cesantias.ts` y el calendario comercial de `lib/payroll/thirteenth-fourteenth/`.

Estimación orientativa. No sustituye asesoría legal ni el saldo efectivo en el RAP.

## Entrada

| Campo | Uso |
|---|---|
| `salarioBaseMensual` | Base para 13vo, 14vo y estimación de reserva laboral |
| `salarioPromedioMensual` / `salariosUltimos6Meses` | Promedio Art. 123 (cesantía, preaviso, vacaciones) |
| `fechaIngreso` / `fechaEgreso` | `YYYY-MM-DD` parseadas con `parseDateYmd` (día civil local) |
| `motivoSalida` | Factor de cesantía y preaviso |
| `montoRapAcumulado` | Saldo RAP real; si es 0 se estima la reserva laboral |

## Año comercial 360/30

Antigüedad y proporcionales usan año comercial de 360 días y mes de 30 días (`diffDays360`), con conteo **inclusivo** de ambos extremos.

Las fechas ISO se parsean con `parseDateYmd` (`new Date(y, m - 1, d)`), nunca con `new Date('YYYY-MM-DD')`, para evitar el desfase de un día en zonas UTC−6.

## Rubros

### Preaviso (Art. 116)

Aplica cuando el motivo es imputable al empleador (`DESPIDO_INJUSTIFICADO`, `CAUSA_AJENA_TRABAJADOR`) y no se gozó el preaviso.

| Antigüedad | Días |
|---|---|
| &lt; 3 meses | 1 |
| 3–6 meses | 7 |
| 6–12 meses | 14 |
| 1–2 años | 30 |
| &gt; 2 años | 60 |

Monto = días × salario promedio diario.

### Cesantía (Art. 120)

Base (antes del factor por motivo):

| Antigüedad | Días de salario promedio |
|---|---|
| &lt; 3 meses | 0 |
| 3–6 meses | 10 |
| 6–12 meses | 20 |
| ≥ 1 año | 30 por año completo + (días fracción ÷ 12) |

Tope: 25 meses (750 días).

Factor por motivo (resumen):

- Renuncia ordinaria: 0 (salvo ≥15 años con `retiroVoluntario` → 35%)
- Despido injustificado / causa ajena: 100%
- Fallecimiento natural ≥6 meses: 75%

### Vacaciones en liquidación (Arts. 345–349 + guía STSS)

Distinto del **goce** en empleados activos (requiere año completo, Art. 346). En liquidación se paga:

1. **Último año completo** (si `anos ≥ 1`): días Art. 346 (10/12/15/20) × salario promedio diario.
2. **Año incompleto**: `días_fracción ÷ divisor × salario promedio diario`.

Divisores STSS del año incompleto:

| Año en curso | Divisor |
|---|---|
| 1.º (&lt; 1 año completo) | 36 |
| 2.º | 30 |
| 3.º | 24 |
| 4.º o más | 18 |

Equivalencia primer año: `días ÷ 36` = `(10 ÷ 360) × días`.

### 13vo (aguinaldo) y 14vo (compensación social)

- 13vo: período 1 ene – 31 dic del año de egreso (desde ingreso si es posterior).
- 14vo: período 1 jul – 30 jun (desde ingreso si es posterior).
- Fórmula: `(salario base mensual ÷ 360) × días en período`.
- Sin deducciones legales sobre estos rubros (Decretos 112-82 y 135-94).

### Reserva laboral (RAP)

Estimación (paridad calculadora pública STSS):

```text
baseReserva = promedio(salariosUltimos6Meses) si existe, si no salarioBaseMensual
reservaLaboralEstimada = baseReserva × 4% × (totalDias ÷ 30)
```

No se usa el promedio Art. 123 (incluye 50% de 13°/14°) como base del aporte RAP.

Saldo efectivo:

- Si `montoRapAcumulado > 0` → saldo real.
- Si no → `reservaLaboralEstimada`.

Tratamiento:

| Situación | `rapAplicado` | `reservaLaboralEnTotal` |
|---|---|---|
| Cesantía bruta &gt; 0 | `min(cesantía, saldoRAP)` | `max(0, saldoRAP − rapAplicado)` |
| Sin cesantía (p. ej. renuncia) | 0 | saldoRAP completo |

Disclaimer (UI / PDF / email):

> El concepto de reserva laboral está calculado en base al salario de los últimos 6 meses conforme la información proporcionada por el usuario. Este valor puede variar en relación con el monto efectivo depositado en el RAP.

### Total

```text
totalPagar = preaviso + cesantiaNeta + vacaciones + aguinaldo + decimoCuarto + reservaLaboralEnTotal
```

## Caso de control (STSS cálculo 5,380,240)

| Dato | Valor |
|---|---|
| Ingreso | 2025-10-20 |
| Egreso | 2026-07-18 |
| Motivo | Renuncia |
| Salario base | L. 16,000.00 |
| Salario promedio | L. 18,666.60 |
| Antigüedad 360 | 0a 8m 29d (269 días) |

| Rubro | STSS | Motor SISU |
|---|---:|---:|
| Preaviso / cesantía | 0.00 | 0.00 |
| Vacaciones | 4,649.37 | 4,649.37 |
| 13vo | 8,799.95 | 8,800.00 |
| 14vo | 800.00 | 800.00 |
| Reserva laboral | 5,738.67 | 5,738.67 |
| **Total** | **19,987.99** | **19,988.04** |

La diferencia de L. 0.05 en el 13vo proviene del redondeo intermedio del salario base diario en STSS (`533.33 × 198/12`) frente a `(16000/360) × 198`.

Tests: `tests/cesantias.test.ts` (`alinea con caso STSS cálculo 5,380,240`).

## Archivos clave

| Archivo | Rol |
|---|---|
| `lib/payroll/cesantias.ts` | Motor de liquidación |
| `lib/payroll/cesantias-schema.ts` | Validación de entrada |
| `lib/payroll/thirteenth-fourteenth/calendar.ts` | `parseDateYmd`, `diffDays360`, períodos 13/14 |
| `lib/payroll/thirteenth-fourteenth/calculate.ts` | Fórmulas 13vo/14vo |
| `lib/leave/honduras-labor-reference.ts` | Goce de vacaciones (empleados activos), no liquidación |
| `pages/api/public/calculate-prestaciones.ts` | API pública |
| `pages/app/cesantias.tsx` | UI autenticada |

## Fuentes

1. [Guía para elaborar cálculos de prestaciones laborales (STSS)](https://www.trabajo.gob.hn/wp-content/uploads/2017/11/guiacalculo.pdf) — divisores de vacaciones 36/30/24/18; cesantía proporcional días/12; 13vo/14vo.
2. [Código del Trabajo de Honduras (TSC)](https://www.tsc.gob.hn/web/leyes/codigo_de_trabajo.pdf) — Arts. 116, 120–123, 345–350.
3. [Consulta STSS — prestaciones](http://consulta.trabajo.gob.hn/decretos/scr/Prestaciones.htm) — texto Art. 346.
4. Calculadora pública STSS (`consulta.trabajo.gob.hn`) — presentación de reserva laboral y disclaimer.
5. Decreto 112-82 (décimo tercer mes) y Decreto 135-94 + [Reglamento del décimo cuarto mes (TSC)](https://www.tsc.gob.hn/biblioteca/index.php/reglamentos/79-reglamento-del-decimo-cuarto-mes-de-salario).
6. Ley del Fondo de Reserva Laboral de Capitalización Individual administrado por el RAP — renuncia: 100% del saldo; despido injustificado: compensación de cesantía; exceso al trabajador.
