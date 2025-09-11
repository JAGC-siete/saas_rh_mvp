# Humano SISU - Sistema de Recursos Humanos

Sistema completo de gestión de recursos humanos con funcionalidades de nómina, asistencia, gamificación y reportes.

## 🚀 Características Principales

### Gestión de Empleados
- Registro y administración de empleados
- Gestión de departamentos
- Perfiles de usuario con roles
- Búsqueda y filtrado avanzado

### Sistema de Nómina
- Cálculo automático de nómina (IHSS, RAP, ISR)
- Generación de vouchers individuales
- Exportación a PDF y Excel
- Auditoría y versionado de nóminas
- Envío por email

### Control de Asistencia
- Registro de entrada y salida
- Cálculo de horas trabajadas
- Detección de tardanzas
- Reportes de asistencia
- Integración con nómina

### Gamificación
- Sistema de logros y puntos
- Tabla de clasificación
- Progreso de empleados
- Motivación y engagement

### Reportes y Analytics
- Dashboard ejecutivo
- KPIs de asistencia
- Tendencias de nómina
- Exportación de datos

## 🛠️ Tecnologías

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **UI**: shadcn/ui, Headless UI
- **Deployment**: Railway, Vercel
- **Styling**: Tailwind CSS con Glass Morphism

## 📋 Requisitos

- Node.js 18+
- npm o yarn
- Cuenta de Supabase
- Variables de entorno configuradas

## ⚙️ Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd saas-proyecto
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp env.example .env.local
# Editar .env.local con tus credenciales de Supabase
```

4. **Ejecutar en desarrollo**
```bash
npm run dev
```

## 🔧 Configuración

### Variables de Entorno Requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_api_key
```

### Base de Datos

El sistema utiliza Supabase con las siguientes tablas principales:
- `employees` - Información de empleados
- `attendance` - Registros de asistencia
- `payroll_runs` - Ejecuciones de nómina
- `payroll_lines` - Líneas de nómina
- `departments` - Departamentos
- `achievements` - Sistema de gamificación

## 🚀 Despliegue

### Railway (Recomendado)
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login y deploy
railway login
railway up
```

### Vercel
```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

## 📱 Uso del Sistema

### Para Administradores
1. Acceder a `/app/dashboard`
2. Configurar empleados y departamentos
3. Generar nóminas desde `/app/payroll`
4. Revisar reportes en `/app/reports`

### Para Empleados
1. Registrar asistencia en `/attendance/register`
2. Ver perfil y logros en `/app/gamification`
3. Consultar nóminas enviadas por email

## 🔒 Seguridad

- Autenticación con Supabase Auth
- Autorización basada en roles
- Validación de datos en frontend y backend
- Logs de auditoría para operaciones críticas
- Encriptación de datos sensibles

## 📊 Monitoreo

- Logs estructurados con Winston
- Métricas de performance
- Alertas de errores
- Dashboard de salud del sistema

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o consultas:
- Email: soporte@humanosisu.com
- Documentación: [docs.humanosisu.com](https://docs.humanosisu.com)
- Issues: [GitHub Issues](https://github.com/your-repo/issues)

## 🏆 Créditos

Desarrollado con ❤️ para empresas hondureñas que buscan digitalizar su gestión de recursos humanos.

---

**Versión**: 1.0.0  
**Última actualización**: Diciembre 2024
