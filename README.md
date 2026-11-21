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
