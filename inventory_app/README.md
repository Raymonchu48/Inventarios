# Inventario Pro

Aplicación web local para gestionar inventario a partir del Excel aportado.

## Qué incluye
- `index.html`: interfaz principal.
- `styles.css`: estilos.
- `app.js`: lógica de la app.
- `data.json`: inventario inicial convertido desde el Excel.
- `inventario.sqlite`: base de datos SQLite con los mismos registros.

## Cómo usarla
1. Descarga y descomprime la carpeta.
2. Abre `index.html` en tu navegador.
3. Pulsa **Cargar inventario original** para inicializar la base local.
4. A partir de ahí podrás:
   - buscar y filtrar,
   - añadir, editar y borrar artículos,
   - exportar a JSON o CSV,
   - importar un JSON,
   - reutilizar `inventario.sqlite` como base de datos en otras herramientas.

## Observación
Los cambios se guardan en el navegador del dispositivo donde abras la app.
Si quieres mover la base a otro equipo, exporta a JSON o usa el archivo SQLite.
