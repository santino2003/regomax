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

## Escaneo de DNI en ingresos

El ingreso con DNI admite el número manual y los escaneos con separador `@`
o `\@`. También reconoce lectores que envían `2` como separador y `&` en las
fechas, conservando los dígitos `2` del trámite y del DNI. Si la persona ya
está registrada, se recuperan sus datos sin sobrescribirlos.
Este ajuste no requiere cambios en la base de datos.

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
El listado muestra nombre y apellido en una sola columna y prioriza los ingresos
sin egreso vinculado; dentro de cada grupo ordena del más reciente al más antiguo.
La orden de venta y el JPG adjunto no se muestran como columnas.

Para tablas existentes, aplicar una vez `src/scripts/ingresos_egresos_logistica.sql`
antes de usar esta versión. Las instalaciones nuevas ya incluyen la columna en
`src/scripts/ingresos_egresos_table.sql`.

## Adjunto opcional en ingresos

Todos los motivos, incluido **Basura**, admiten un PDF, JPG o JPEG opcional de
hasta 10 MB, por selección o arrastrando el archivo. Las imágenes muestran vista
previa; el PDF muestra su nombre. Se puede quitar el adjunto antes de guardar.
Se guarda en `uploads/ingresos` (o en `ingresos` dentro de `UPLOADS_PATH`) con
un nombre único. La base conserva su ruta junto al ingreso.
La acción **Ver detalles** del listado abre los datos completos del movimiento,
muestra los JPG y ofrece un enlace para abrir los PDF. En un egreso también
se muestra el adjunto de su ingreso original. Al volver se conserva la página
del listado desde la que se abrió el detalle.
Se reutiliza la columna `archivo_jpg` existente también para los PDF.
Si se rechaza el archivo o falla el registro del ingreso, se elimina la subida.

Para tablas existentes, aplicar una vez `src/scripts/ingresos_egresos_archivo_jpg.sql`
antes de usar esta versión. Las instalaciones nuevas ya incluyen la columna en
`src/scripts/ingresos_egresos_table.sql`.

## Editar ingresos

El lápiz en las acciones del listado y **Editar ingreso** en el detalle permiten
modificar nombre, apellido, motivo, empresa, patente y reemplazar el adjunto
opcional. La fecha de ingreso y los egresos históricos conservan sus datos.
Sin un archivo nuevo se conserva el adjunto actual. Al reemplazarlo, el anterior
se elimina del disco después de guardar. La orden logística ya asociada se puede
conservar aunque esté cerrada; una orden nueva debe estar abierta o en logística.
La edición utiliza el mismo permiso `ingresos:create` que el módulo de ingresos.

## Exportar bienes a Excel

En el listado de bienes, **Exportar Excel** permite descargar todos los bienes,
los resultados del filtro actual de todas las páginas, o los bienes seleccionados
mediante las casillas. La selección se conserva al cambiar de página y se limpia
al aplicar o quitar filtros. La casilla del encabezado selecciona la página visible.
El archivo incluye código, nombre, descripción, tipo, categoría, familias, unidad,
stock, stock crítico, ubicación y almacén. La exportación requiere `bien:view`.

## Personal e ingresos sin DNI

En la pantalla inicial de ingresos, **Ingreso de personal** permite seleccionar
personal registrado sin pedir DNI. **Administrar personal** ofrece altas, edición,
baja y reactivación. Nombre y apellido son obligatorios; patente, auto, cargo y turno
son opcionales. El adjunto PDF/JPG también es opcional.

Los datos del padrón se guardan en `personal`. Cada entrada y salida se incorpora
a `ingresos_egresos` con el motivo **Personal**, conservando los datos de ese momento.
Se pueden ajustar patente, auto, cargo y turno para una entrada sin modificar el
padrón. No se permite otro ingreso de la misma persona hasta registrar su egreso.
La baja del padrón conserva su historial y permite cerrar las entradas pendientes.
Las pantallas y API utilizan el permiso existente `ingresos:create`.

El **ojito** en las acciones de Personal abre su ficha con los datos actuales del
padrón y su historial de ingresos y egresos, ordenado por fecha descendente y
paginado de a 50 movimientos. Cada fila conserva patente, auto, cargo y turno
del movimiento, y permite abrir su detalle con adjuntos. El historial se vincula
por el identificador de personal y permanece disponible después de una baja.
Desde un movimiento se puede volver a la misma página de la ficha.

Para una instalación existente, ejecutar en este orden:

1. `src/scripts/personal_table.sql`.
2. `src/scripts/ingresos_egresos_personal.sql` (una sola vez).

En una instalación nueva, crear `personas` y `personal` con sus scripts antes de
`ingresos_egresos_table.sql`, que ya incluye las columnas de personal.

## Buscar ingresos y egresos

El listado permite combinar nombre y apellido, patente, empresa, motivo, tipo de
movimiento, estado y fechas del movimiento desde/hasta (ambos días incluidos).
La búsqueda por texto admite términos separados y en cualquier orden. Los filtros
se aplican al historial completo antes de paginar, y se conservan al navegar por
las páginas o volver del detalle o la edición. Los ingresos sin egreso vinculado
mantienen la prioridad. **Limpiar** vuelve al historial completo.

## Descripción de ingresos y personal

Todos los motivos de ingreso y el padrón de personal admiten una descripción
opcional de hasta 2000 caracteres, visible y editable en sus fichas. En el ingreso
de personal se propone la descripción del padrón y puede ajustarse para ese
movimiento sin modificar el padrón. El egreso conserva la descripción del ingreso.

Para bases existentes, ejecutar una vez
`src/scripts/ingresos_personal_descripcion.sql`. Las tablas nuevas ya incluyen
las columnas en `personal_table.sql` e `ingresos_egresos_table.sql`.

## Motivos Proveedor y Visita

Ambos motivos están disponibles al registrar, editar y filtrar ingresos.
**Proveedor** utiliza empresa del padrón y patente obligatorias, igual que Basura.
En **Visita** la empresa es opcional y la patente sigue siendo obligatoria.
La descripción y el adjunto PDF/JPG son opcionales en ambos casos.
No requieren cambios adicionales en la base de datos.

## Empresas de ingresos

**Empresas de ingresos** administra las empresas de Basura, Acero, Proveedor y
Visita, con nombre, descripción opcional, edición y baja/reactivación. Los
formularios de alta y edición de ingresos usan un desplegable con un botón **+**
que permite crear y seleccionar una empresa sin salir ni perder los otros datos.
Visita sigue admitiendo empresa vacía. NFU y Logística conservan sus selectores.
Los movimientos guardan el nombre de la empresa como estaba al registrarlos.

Para una base existente ejecutar, en orden:

1. `src/scripts/empresas_ingresos_table.sql`.
2. `src/scripts/ingresos_egresos_empresa_abm.sql` (una sola vez).

El segundo script recupera las empresas cargadas anteriormente en los cuatro
motivos y vincula sus movimientos. No modifica las empresas de NFU o Logística.
En bases nuevas, crear `empresas_ingresos` antes de `ingresos_egresos_table.sql`.
El módulo utiliza el permiso existente `ingresos:create`.

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
