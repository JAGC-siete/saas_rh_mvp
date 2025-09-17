# 🔒 EMPLOYEE PORTAL SECURITY - HARDENED

## ✅ PARCHES IMPLEMENTADOS

### **1. PIN Security with PEPPER**
- **HMAC-SHA256** del PIN con PEPPER secreto antes de bcrypt
- **bcrypt cost=10** (reducido para evitar DoS)
- **PEPPER** almacenado fuera de DB (env variables)

### **2. Atomic Lockout System**
- **UPSERT atómico** sin race conditions
- **5 intentos** en ventana de 15 minutos
- **Bloqueo de 30 minutos** automático
- **Consulta en DB** por cada intento (no solo memoria)

### **3. SECURITY DEFINER Functions**
- **authenticate_employee()** maneja TODO el flujo
- **Bypass de RLS** solo para funciones del sistema
- **No acceso directo** de usuarios a tablas sensibles

### **4. Uniform Timing & Responses**
- **500ms delay** constante en todas las respuestas
- **Mismo mensaje** para todos los errores: "Credenciales inválidas"
- **Mismo status code** (401) para todos los fallos

### **5. Token Hash Indexing**
- **UNIQUE INDEX** en hash del token (no el token)
- **SHA256** del token para almacenamiento
- **Lookup rápido** sin exponer tokens

### **6. Enhanced RLS Policies**
- **auth.uid()** obligatorio en todas las policies
- **Bloqueo total** de INSERT/UPDATE directo
- **Solo SELECT** para dueños de sesiones

## 🔐 CONFIGURACIÓN REQUERIDA

### **Environment Variables (CRÍTICO)**
```bash
# Generate with: openssl rand -hex 32
EMPLOYEE_PIN_PEPPER=your_secret_pin_pepper_here_64_chars_minimum
EMPLOYEE_LAST5_PEPPER=your_secret_last5_pepper_here_64_chars_minimum
```

### **Database Setup**
```sql
-- Run migration first
\i supabase/migrations/20250917000001_add_employee_pin_auth.sql

-- Set peppers (do this at app startup)
SELECT set_config('app.pin_pepper', 'your_pepper_here', false);
SELECT set_config('app.last5_pepper', 'your_other_pepper_here', false);
```

## 🛡️ SECURITY FEATURES

### **Multi-Layer PIN Protection**
1. **HMAC-SHA256** con PEPPER secreto
2. **bcrypt** con salt aleatorio  
3. **No índices** en hashes (previene enumeración)
4. **Rate limiting** en DB y aplicación

### **Session Security**
1. **256-bit entropy** tokens (hex encoding)
2. **Solo hash** almacenado en DB
3. **UNIQUE constraint** previene duplicados
4. **8 horas** de expiración

### **Audit Trail**
1. **Todos los intentos** loggeados con datos hasheados
2. **IP y User-Agent** para forense
3. **TTL automático** (90 días recomendado)
4. **Particionado** por fecha para performance

### **Attack Resistance**
- ✅ **Brute force**: Rate limiting + lockout atómico
- ✅ **Timing attacks**: Delays uniformes
- ✅ **Enumeration**: Sin índices en secretos
- ✅ **Rainbow tables**: PEPPER + salt único
- ✅ **Race conditions**: UPSERT atómico
- ✅ **SQL injection**: Prepared statements + SECURITY DEFINER

## 📈 PERFORMANCE CONSIDERATIONS

### **bcrypt Cost Reduction**
- **cost=10** en lugar de 12 (evita DoS)
- **~100ms** por hash vs ~400ms
- **PEPPER** compensa la reducción de costo

### **Database Indexing**
```sql
-- Fast lookups without exposing secrets
CREATE UNIQUE INDEX ux_employee_sessions_token_hash ON employee_auth_sessions(session_token_hash);
CREATE INDEX idx_employee_failed_attempts_ip ON employee_failed_attempts(ip_address);
CREATE INDEX idx_employee_auth_logs_created ON employee_auth_logs(created_at);
```

### **Cleanup Jobs**
```sql
-- Run daily via pg_cron
SELECT cleanup_expired_employee_sessions();
DELETE FROM employee_auth_logs WHERE created_at < NOW() - INTERVAL '90 days';
DELETE FROM employee_failed_attempts WHERE locked_until < NOW() - INTERVAL '1 day';
```

## 🚨 PRODUCTION CHECKLIST

### **Before Deploy**
- [ ] Generate strong PEPPER values (64+ chars)
- [ ] Set environment variables in production
- [ ] Configure pg_cron for cleanup
- [ ] Test rate limiting under load
- [ ] Verify uniform timing (500ms ±50ms)

### **Monitoring**
- [ ] Alert on high failed attempt rates
- [ ] Monitor bcrypt performance
- [ ] Track session cleanup efficiency
- [ ] Audit log retention compliance

### **Security Validation**
- [ ] Penetration test timing attacks
- [ ] Validate rate limiting bypass attempts  
- [ ] Test concurrent authentication load
- [ ] Verify PEPPER rotation process

## 🔄 FUTURE ENHANCEMENTS

### **Optional Hardening**
1. **2FA** para acciones sensibles (voucher download)
2. **IP geolocation** blocking por país
3. **Device fingerprinting** para detección de anomalías
4. **Token rotation** (short-lived access + refresh)

### **Compliance**
1. **GDPR**: Minimización de datos en logs
2. **SOC 2**: Auditoría de accesos
3. **PCI DSS**: Si se maneja información financiera

---

## ⚠️ DISCLAIMER

Este sistema implementa **defensa en profundidad** pero NO es "100% seguro". La seguridad es un proceso continuo que requiere:

- **Monitoreo constante**
- **Actualizaciones regulares**  
- **Auditorías de seguridad**
- **Respuesta a incidentes**

**Recomendación**: Contratar auditoría de seguridad externa antes de producción.
