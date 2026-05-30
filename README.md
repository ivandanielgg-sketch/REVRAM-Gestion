# Bitácora de Calderas Industriales

Sistema web para registro, consulta y filtrado de la operación diaria de calderas industriales.

> **Sistema de apoyo documental para operación, mantenimiento, trazabilidad y consulta histórica. La validación normativa final debe ser realizada por personal calificado.**

Inspirado en prácticas comunes de bitácoras de cuarto de calderas y mantenimiento preventivo (referencia: fabricantes como Cleaver-Brooks), con estructura compatible con documentación operativa alineada a NOM-020-STPS-2011 y buenas prácticas relacionadas con NFPA 85.

## Stack

- **Next.js 14** (App Router)
- **PostgreSQL** + **Prisma ORM**
- **JWT** (cookies httpOnly) para autenticación
- **Zod** para validaciones
- **Recharts** para gráficas
- **Tailwind CSS** para UI responsive

## Requisitos

- Node.js 18+
- PostgreSQL 14+

## Instalación local

```bash
# Clonar e instalar dependencias
npm install

# Configurar variables de entorno (OBLIGATORIO)
cp .env.example .env
# Editar DATABASE_URL y JWT_SECRET en .env

# Crear base de datos PostgreSQL
createdb boiler_logbook

# Ejecutar migraciones y seed
npx prisma migrate deploy
npx prisma db seed

# Iniciar en desarrollo
npm run dev
```

> **Importante:** Sin el archivo `.env` con `DATABASE_URL` configurada, el login mostrará error de conexión.

Abrir [http://localhost:3000](http://localhost:3000)

## Usuario administrador inicial (seed)

| Campo      | Valor              |
|------------|--------------------|
| Usuario    | `admin`            |
| Correo     | `admin@example.com`|
| Contraseña | `cambiar123`       |

**Importante:** El sistema obliga a cambiar la contraseña en el primer acceso.

### Otros usuarios demo

| Usuario        | Contraseña          | Rol           |
|----------------|---------------------|---------------|
| supervisor     | supervisor123       | Supervisor    |
| operador       | operador123         | Operador      |
| mantenimiento  | mantenimiento123    | Mantenimiento |
| consulta       | consulta123         | Solo consulta |

## Módulos

1. **Autenticación** — Login, recuperación de contraseña, cambio de contraseña, roles y permisos
2. **Dashboard** — Resumen operativo, alertas, accesos rápidos
3. **Catálogo de calderas** — Registro, límites operativos, alertas automáticas
4. **Bitácora estándar** — Formulario completo con checklist de seguridad
5. **Alertas** — Detección automática por límites configurados
6. **Historial** — Filtros avanzados y exportación CSV
7. **Mantenimiento** — Órdenes desde alertas o bitácoras
8. **Reportes** — Resumen diario, tendencias, eventos críticos
9. **Auditoría** — Trazabilidad de acciones críticas
10. **Usuarios** — Administración de roles (solo administrador)

## Roles y permisos

| Rol            | Permisos principales                                      |
|----------------|-----------------------------------------------------------|
| Administrador  | Acceso completo                                           |
| Supervisor     | Revisar, aprobar, comentar, bloquear registros            |
| Operador       | Crear y editar bitácoras                                  |
| Mantenimiento  | Registrar órdenes de mantenimiento                        |
| Solo consulta  | Consultar y exportar, sin editar                          |

## Variables de entorno

Ver `.env.example` para la lista completa:

- `DATABASE_URL` — Conexión PostgreSQL
- `JWT_SECRET` / `NEXTAUTH_SECRET` — Secreto para tokens
- `APP_URL` — URL pública de la aplicación
- `EMAIL_SERVER_*` — Configuración SMTP para recuperación de contraseña

## Scripts

```bash
npm run dev          # Desarrollo
npm run build        # Build producción
npm run start        # Servidor producción
npm run db:migrate   # Migraciones desarrollo
npm run db:deploy    # Migraciones producción
npm run db:seed      # Datos iniciales
```

## Solución: puerto 3000 ocupado (`EADDRINUSE`)

Si al ejecutar `npm start` o `npm run dev` aparece:

```
Error: listen EADDRINUSE: address already in use :::3000
```

significa que **otro proceso ya usa el puerto 3000** (por ejemplo, otra instancia de `next dev` o `npm start` que quedó en segundo plano). No es un error de compilación ni de Prisma.

### Liberar el puerto 3000

**Mac / Linux:**

```bash
lsof -i :3000
kill -9 $(lsof -ti :3000)
```

### Usar otro puerto

**Producción local:**

```bash
PORT=3001 npm start
```

**Desarrollo:**

```bash
npm run dev -- -p 3001
```

### Render y variable `PORT`

En Render, la plataforma asigna automáticamente la variable de entorno `PORT`. Next.js la detecta en `npm start` **sin configuración adicional**. No hay puerto hardcodeado en el código del servidor; el valor `3000` en `.env.example` y `APP_URL` solo aplica a la URL pública para enlaces (correos, etc.), no al puerto de escucha.

## Despliegue en Render

Ver [README-DEPLOY.md](./README-DEPLOY.md) para instrucciones detalladas.

## Estructura de datos (análisis futuro)

El esquema Prisma separa parámetros normalizados en tablas dedicadas (`BoilerLogCombustion`, `BoilerLogWaterTreatment`, `ParameterDefinition`) para facilitar análisis futuro de tendencias, correlaciones y mantenimiento predictivo.

## Licencia

Proyecto demo — uso interno.
