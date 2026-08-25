# Instalar Humano SISU Bridge (para el partner / TI de Odoo)

Entregar **una** carpeta según la versión del cliente:

| Odoo del cliente | Carpeta |
|------------------|---------|
| 19.0 | `odoo-addons/19.0/humano_sisu_bridge` |
| 18.0 | `odoo-addons/18.0/humano_sisu_bridge` |

No mezclar versiones. No instalar las dos.

## 1. Copiar el módulo

Copiar `humano_sisu_bridge` al **addons path** del servidor (o al repositorio de odoo.sh). Reiniciar Odoo si es on-prem.

Odoo Online / Custom: el partner sube el módulo al entorno. Planes sin API externa no sirven para SISU.

## 2. Instalar

1. Activar **modo desarrollador**.
2. Aplicaciones → Actualizar lista de aplicaciones.
3. Buscar **Humano SISU Bridge** → Instalar.

Dependencias que Odoo resuelve solo: `Empleados` (`hr`) y `Invoicing/Contabilidad` (`account`). **No** instala nómina de Odoo.

## 3. Diario miscellaneous

Crear (o reutilizar) un diario de **asientos varios** / miscellaneous.

- Tipo: **General** (no ventas, no compras, no banco).
- Código: el mismo que en SISU (por defecto `NOM`).
- Compañía: la empresa Odoo que mapea a la empresa SISU.

Sin este diario, el envío de planilla falla con “Journal code … not found” o “must be miscellaneous”.

## 4. Usuario bot

1. Ajustes → Usuarios → Nuevo.
2. Nombre: `SISU bot` (o similar).
3. Correo interno cualquiera; **no** es un usuario de oficina.
4. Tipo: usuario interno.
5. Grupo:
   - Odoo 19: **Humano SISU / Bridge bot**
   - Odoo 18: **Humano SISU Bridge**
6. Compañía: **solo** la empresa del cliente (MVP = 1 a 1).
7. Guardar.

Ese grupo ya incluye Officer de empleados y “Show Full Accounting Features”. No hace falta marcar más grupos a mano.

## 5. API key

1. Entrar como el bot (o generar la key desde Ajustes del bot).
2. Preferencias → Seguridad de la cuenta → **Nueva API Key**.
3. Duración máxima **90 días** (en 19 el grupo lo impone).
4. Copiar la key **una vez**. Pegarla en SISU (Contabilidad → Odoo). Nunca en un ticket público.

Odoo 18: SISU también necesita el **login** (email/usuario) del bot y el **nombre de la base**.

Odoo 19: basta la key + URL (+ base si el host sirve varias).

## 6. Prueba

En SISU: Guardar conexión → **Probar conexión**.

En Odoo, tras el primer empleado: ficha con campo **SISU Employee ID**. Tras **Enviar a Odoo**: asiento en **borrador** con **SISU Journal Entry ID**. El contador publica en Odoo; el módulo no publica.

## Qué no hace este módulo

- No calcula IHSS / ISR / RAP.
- No sincroniza salario, bancos, departamentos ni asistencia.
- No crea `hr.payslip`.
- No pisa asientos ya publicados. Un reenvío del mismo ID SISU no duplica.
