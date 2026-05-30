# Despliegue en Render

Esta guía describe cómo desplegar la Bitácora de Calderas en [Render](https://render.com) con PostgreSQL.

## Opción A: Blueprint (render.yaml)

1. Conecte su repositorio en Render Dashboard
2. Seleccione **New > Blueprint**
3. Render detectará `render.yaml` y creará:
   - Servicio web Node.js
   - Base de datos PostgreSQL

4. Configure manualmente estas variables en el servicio web:
   - `APP_URL` — URL del servicio (ej. `https://boiler-logbook.onrender.com`)
   - `EMAIL_SERVER_HOST`, `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASSWORD`, `EMAIL_FROM` (opcional)

5. El despliegue ejecutará automáticamente:
   ```bash
   npm install
   npx prisma generate
   npm run build
   npx prisma migrate deploy
   npx prisma db seed
   npm run start
   ```

## Opción B: Configuración manual

### 1. Crear PostgreSQL

1. En Render Dashboard: **New > PostgreSQL**
2. Nombre: `boiler-logbook-db`
3. Plan: Free o superior
4. Copie la **Internal Database URL**

### 2. Crear Web Service

1. **New > Web Service**
2. Conecte el repositorio
3. Configuración:

| Campo        | Valor                                      |
|--------------|--------------------------------------------|
| Runtime      | Node                                       |
| Build Command| `npm install && npx prisma generate && npm run build` |
| Start Command| `npm run start`                            |

### 3. Variables de entorno

| Variable              | Valor                                      |
|-----------------------|--------------------------------------------|
| `DATABASE_URL`        | Internal Database URL de PostgreSQL        |
| `JWT_SECRET`          | Cadena aleatoria segura (32+ caracteres)   |
| `NEXTAUTH_SECRET`     | Otra cadena aleatoria segura               |
| `APP_URL`             | URL pública del servicio                   |
| `NODE_ENV`            | `production`                               |
| `EMAIL_SERVER_HOST`   | SMTP host (opcional)                       |
| `EMAIL_SERVER_USER`   | SMTP usuario (opcional)                    |
| `EMAIL_SERVER_PASSWORD`| SMTP contraseña (opcional)                |
| `EMAIL_FROM`          | Correo remitente (opcional)                |

### 4. Migraciones y seed

En el primer despliegue, ejecute desde la shell de Render o como **Pre-Deploy Command**:

```bash
npx prisma migrate deploy && npx prisma db seed
```

### 5. Verificar

1. Acceda a la URL del servicio
2. Inicie sesión con `admin` / `cambiar123`
3. Cambie la contraseña obligatoria
4. Verifique dashboard, calderas demo y bitácoras demo

## Notas de producción

- Use plan PostgreSQL con persistencia (Free tier puede reiniciarse)
- Configure `APP_URL` correctamente para enlaces de recuperación de contraseña
- Sin SMTP configurado, los enlaces de reset se imprimen en logs del servidor
- Revise logs de Render si `preDeployCommand` falla por timeout en seed

## Comandos útiles en shell de Render

```bash
npx prisma migrate status
npx prisma db seed
npx prisma studio  # solo desarrollo local
```

## Usuario administrador post-seed

- Usuario: `admin`
- Contraseña temporal: `cambiar123`
- Debe cambiar contraseña en primer acceso
