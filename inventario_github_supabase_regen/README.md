# Inventario Pro · GitHub Pages + Supabase

Proyecto estático listo para subir a **GitHub Pages** y usar con **Supabase** como base de datos real.

## Incluye
- Dashboard de inventario
- Alta, edición y borrado de productos
- Registro de entradas, salidas y ajustes
- Historial de movimientos
- Importación inicial del inventario desde `data.json`
- Scripts SQL:
  - `schema.sql`
  - `seed.sql`

## Estructura
- `index.html`
- `styles.css`
- `app.js`
- `data.json`
- `schema.sql`
- `seed.sql`
- `config.example.js`

## Paso 1: crear la base en Supabase
1. Crea un proyecto en Supabase.
2. Ve a **SQL Editor**.
3. Ejecuta primero `schema.sql`.
4. Ejecuta luego `seed.sql`.

## Paso 2: conectar la app
Tienes dos opciones:

### Opción A · desde la interfaz
1. Abre `index.html`.
2. Ve a **Configuración**.
3. Pega:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
4. Pulsa **Guardar conexión**.

La app guarda esos datos en `localStorage` del navegador.

### Opción B · archivo config.js
1. Duplica `config.example.js` y renómbralo a `config.js`.
2. Rellena:
```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://TU-PROYECTO.supabase.co",
  SUPABASE_ANON_KEY: "TU_ANON_KEY"
};
```

## Paso 3: subir a GitHub
Sube **todos los archivos sueltos** del proyecto a la raíz del repositorio.

## Paso 4: publicar con GitHub Pages
1. Repositorio → **Settings**
2. **Pages**
3. Source: `Deploy from a branch`
4. Branch: `main`
5. Folder: `/root`

Tu URL quedará como:
`https://TU-USUARIO.github.io/TU-REPO/`

## Importante sobre seguridad
Esta versión está pensada para arrancar rápido y funcionar.
Las políticas RLS del `schema.sql` permiten operaciones públicas con la `anon key`.

Para producción real, conviene endurecerlo con:
- autenticación
- políticas por usuario/rol
- auditoría
- validación por almacén o centro de coste

## Datos convertidos desde tu Excel
- Productos: 134
- Categorías: 14

## Recomendación técnica
Si lo vas a usar de verdad en hotel, restaurante o banquetes, la siguiente versión debería añadir:
- proveedores
- precio de coste
- valor de inventario
- caducidades y lotes
- lector de códigos
- usuarios y permisos
- exportación a Excel/PDF
