Cliente (Postman) → Rutas → Controladores(req res) → Servicios (logca de negocio)→ Repositorios → Base de Datos
dbeaver-ce &

TO DO

Mailing (puede ser para la que viene)


REPORTE

Produccion del dia, prduccion acumulada Mes (infill y polvo)
Logistica del dia, logistica acumulada del Mes (infill y polvo)
Ingreso NFU del dia, ingreso NFU acumulado del mes
Comparativo de Programado acumulado del mes, comparativo acumulado del mes
Stock al dia de hoy de infill
Stock al dia de hoy de polvo

errores:
despacho:create (varios enpoint)
Agregar opcion de eliminar bolson


FIltros: Desde Hasta, tipo, y CNFU/NFU

## Dar egreso a una persona o vehículo

En **Ingresos → Ingresos y egresos**, cada ingreso sin una salida vinculada tiene
el botón **Dar egreso**. La confirmación muestra la persona, la patente, la empresa
y la fecha de entrada. Al confirmar se guarda otro movimiento, de tipo `EGRESO`,
con la fecha y hora actuales de la base de datos y un vínculo al ingreso original.
El ingreso queda en el historial y muestra la hora de salida. Solo se permite un
egreso vinculado por ingreso, incluso ante solicitudes simultáneas.

Para una base existente, ejecutar una vez
`src/scripts/ingresos_egresos_vincular_egreso.sql` antes de usar la nueva versión.
La columna `empresa` debe existir; si falta, aplicar primero
`src/scripts/ingresos_egresos_empresa.sql`. Las instalaciones nuevas usan
`src/scripts/ingresos_egresos_table.sql`, que ya incluye ambos cambios.
Los movimientos históricos se conservan y sus egresos no se vinculan automáticamente:
el estado «Sin egreso vinculado» indica la ausencia de ese vínculo, no confirma
que la persona siga dentro del predio.

## Ingresos por logística

El motivo **Logística** permite seleccionar una orden de venta **Abierta** o
**En logística**, buscando por cliente final o código de venta. La empresa se
completa con el cliente final y la patente se ingresa manualmente. Al guardar se
verifican nuevamente el estado y el cliente final de la orden. El movimiento
conserva la empresa y el vínculo con la orden, también al dar egreso.

Para tablas existentes, aplicar una vez `src/scripts/ingresos_egresos_logistica.sql`
antes de usar esta versión. Las instalaciones nuevas ya incluyen la columna en
`src/scripts/ingresos_egresos_table.sql`.

## JPG adjunto en ingresos

El formulario admite un JPG o JPEG opcional de hasta 10 MB, por selección o
arrastrando el archivo, con vista previa y opción de quitarlo antes de guardar.
Se guarda en `uploads/ingresos` (o en `ingresos` dentro de `UPLOADS_PATH`) con
un nombre único. La base conserva su ruta y el listado ofrece **Ver JPG**.
Si se rechaza el archivo o falla el registro del ingreso, se elimina la subida.

Para tablas existentes, aplicar una vez `src/scripts/ingresos_egresos_archivo_jpg.sql`
antes de usar esta versión. Las instalaciones nuevas ya incluyen la columna en
`src/scripts/ingresos_egresos_table.sql`.

## Pruebas

Las pruebas de los servicios son unitarias y se guardan en un archivo por servicio:
`tests/<nombreService>.test.js`. Los repositorios, otros servicios, las conexiones,
las transacciones y los envíos de correo se sustituyen por simulaciones. No se
requieren `.env`, credenciales ni una base de datos activa.

Los nombres, comentarios y mensajes propios de las pruebas se escriben en español.
La cobertura nueva se incorpora en bloques de cinco servicios por cada «seguí»,
manteniendo un archivo por servicio. La revisión, la ejecución de las pruebas y
los commits quedan a cargo del usuario. El siguiente bloque se inicia cuando
indique «seguí».

Ejecutar `npm test` con las dependencias instaladas y Node.js 20 o superior.
Para un servicio: `node --test tests/almacenService.test.js`.

También se conservan las comprobaciones de rutas, vistas, exportaciones y
configuración. Estas pruebas tampoco acceden a una base de datos ni envían correos.
Las pruebas unitarias verifican la lógica del servicio y su uso de las dependencias;
no comprueban los bloqueos ni los rollbacks de un servidor MySQL real.
