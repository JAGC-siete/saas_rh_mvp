# Implementación Técnica Google Ads - Humano SISU

## ✅ Implementación Completada

### 1. **Tracking de Conversiones**

**Archivo:** `lib/analytics/googleAds.ts`

Funcionalidades implementadas:
- ✅ `trackGoogleAdsConversion()` - Función base para tracking
- ✅ `trackActivationFormSubmit()` - Tracking de formulario de activación
- ✅ `trackCTAClick()` - Tracking de clicks en CTAs
- ✅ `trackWhatsAppClick()` - Tracking de clicks en WhatsApp
- ✅ `trackComparisonView()` - Tracking de vistas de comparación
- ✅ `getUTMParameters()` - Captura de parámetros UTM
- ✅ `storeUTMParameters()` - Almacenamiento de UTM en sessionStorage
- ✅ `initGoogleAdsTracking()` - Inicialización automática

### 2. **Integración en Páginas**

**Páginas actualizadas:**
- ✅ `pages/index.tsx` - Inicialización de tracking en home
- ✅ `pages/activar.tsx` - Tracking de conversión al enviar formulario
- ✅ `components/LandingHero.tsx` - Tracking de clicks en CTA principal

### 3. **Configuración Google Ads**

**Google Ads Conversion ID:** `AW-17840996991` (ya configurado en `_document.tsx`)

**Conversion Labels a configurar en Google Ads:**
- `activation_form_submit` - Formulario de activación (PRINCIPAL)
- `cta_click` - Click en CTA
- `whatsapp_click` - Click en WhatsApp
- `comparison_view` - Vista de página de comparación
- `demo_request` - Solicitud de demo

---

## 📋 PASOS PARA CONFIGURAR EN GOOGLE ADS

### Paso 1: Crear Conversiones en Google Ads

1. Ve a Google Ads → Herramientas → Conversiones
2. Clic en "+" para crear nueva conversión
3. Selecciona "Sitio web"
4. Configura cada conversión:

**Conversión 1: Activation Form Submit (PRINCIPAL)**
- Nombre: "Formulario Activación"
- Categoría: Lead
- Valor: $0 (o valor estimado de lead)
- Contar: Una vez
- Ventana de atribución: 30 días
- Etiqueta de conversión: `activation_form_submit`

**Conversión 2: CTA Click**
- Nombre: "Click CTA Principal"
- Categoría: Engagement
- Valor: $0
- Contar: Cada vez
- Ventana: 7 días
- Etiqueta: `cta_click`

**Conversión 3: WhatsApp Click**
- Nombre: "Click WhatsApp"
- Categoría: Engagement
- Valor: $0
- Contar: Cada vez
- Ventana: 7 días
- Etiqueta: `whatsapp_click`

### Paso 2: Obtener Conversion Labels

Después de crear cada conversión, Google Ads te dará:
- Conversion ID: `AW-17840996991` (ya lo tienes)
- Conversion Label: `activation_form_submit`, `cta_click`, etc.

### Paso 3: Verificar Tracking

1. Abre tu sitio en modo incógnito
2. Abre DevTools → Network
3. Envía el formulario de activación
4. Busca requests a `google-analytics.com` o `googleadservices.com`
5. Verifica que se envíe el evento de conversión

### Paso 4: Configurar Variable de Entorno (Opcional)

Si quieres usar un Conversion ID diferente por ambiente:

```env
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID=AW-17840996991
```

---

## 🧪 TESTING

### Test Manual:

1. **Test de Formulario:**
   - Ve a `/activar`
   - Completa y envía el formulario
   - Verifica en consola: "Google Ads conversion tracked: activation_form_submit"

2. **Test de CTA:**
   - Ve a `/`
   - Haz clic en "Probalo HOY"
   - Verifica en consola: "Google Ads conversion tracked: cta_click"

3. **Test de UTM:**
   - Visita: `/?utm_source=google&utm_medium=cpc&utm_campaign=test`
   - Verifica en sessionStorage: `utm_params` con los valores

### Test en Google Ads:

1. Ve a Google Ads → Herramientas → Conversiones
2. Clic en "Ver detalles" de una conversión
3. Deberías ver eventos registrados (puede tardar 24-48 horas)

---

## 📊 MONITOREO

### Métricas a revisar semanalmente:

1. **Conversiones registradas:**
   - Google Ads → Conversiones → Ver detalles
   - Comparar con leads reales recibidos

2. **Costo por conversión:**
   - Google Ads → Campañas → Ver métricas
   - Meta: <$25 USD por lead

3. **Tasa de conversión:**
   - Conversiones / Clics
   - Meta: >3%

4. **Quality Score:**
   - Google Ads → Palabras clave
   - Meta: >7/10

---

## 🔧 TROUBLESHOOTING

### Problema: Conversiones no se registran

**Solución:**
1. Verifica que `gtag` esté cargado (revisa `_document.tsx`)
2. Verifica que el Conversion ID sea correcto
3. Verifica que el Conversion Label coincida exactamente
4. Revisa la consola del navegador por errores
5. Espera 24-48 horas (Google puede tardar en mostrar datos)

### Problema: UTM parameters no se capturan

**Solución:**
1. Verifica que `initGoogleAdsTracking()` se llame en el componente
2. Revisa sessionStorage en DevTools
3. Verifica que los parámetros estén en la URL

### Problema: Múltiples conversiones del mismo usuario

**Solución:**
- Esto es normal si el usuario hace múltiples acciones
- Google Ads usa `transaction_id` para deduplicar
- Ajusta "Contar" en configuración de conversión

---

## 📝 NOTAS IMPORTANTES

1. **Privacidad:**
   - El tracking cumple con GDPR/CCPA
   - No se envían datos personales a Google Ads
   - Solo se envían eventos de conversión

2. **Performance:**
   - El tracking es asíncrono (no bloquea la página)
   - Los eventos se envían en background

3. **Datos:**
   - Los datos pueden tardar 24-48 horas en aparecer en Google Ads
   - Los datos en tiempo real están en Google Analytics

---

## 🚀 PRÓXIMOS PASOS

1. **Configurar conversiones en Google Ads** (ver Paso 1)
2. **Crear campañas** (ver `GOOGLE_ADS_STRATEGY.md`)
3. **Lanzar con presupuesto bajo** ($20/día inicial)
4. **Monitorear y optimizar** semanalmente
5. **Escalar keywords ganadoras**

---

**Última actualización:** Enero 2025
**Versión:** 1.0





