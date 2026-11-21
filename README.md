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

Ejecutar `npm test` con las dependencias instaladas y Node.js 20 o superior.
Las pruebas usan el ejecutor incorporado de Node y no requieren `.env`, credenciales
ni una base de datos activa. Cubren registro y privilegios, transacciones de ventas
y despachos, concurrencia de stock, kits, movimientos, XSS en pagos, opciones del
pool MySQL y resolución de rutas. El driver MySQL y el generador de Excel se usan
sin abrir conexiones de red; las operaciones de base de datos se simulan.

Para validar un archivo por separado: `node --test tests/stock.test.js`.
Las pruebas simuladas deben complementarse con una prueba de integración contra
una base de datos de desarrollo antes del despliegue.

## Pruebas de integración con MySQL

Ejecutar `npm run test:integration` contra una base de pruebas con el esquema de la
aplicación. Se carga `.env` y se usa `TEST_DATABASE_URL` si está definida; en caso
contrario se usa `DATABASE_URL`. El comando comprueba el motor InnoDB y ejecuta
los servicios y repositorios con consultas, conexiones y transacciones reales.

Cada prueba crea registros propios con un prefijo aleatorio `IT-` y un responsable
`integration_...`, y los elimina al terminar, incluso si una aserción falla. No se
vacían tablas ni se cambian esquemas. Las notificaciones se capturan sin enviar
correos. Se cubren concurrencia, decimales, kits, movimientos y rollback ante
restricciones reales de MySQL.

`npm test` sigue ejecutando únicamente las pruebas que no necesitan base de datos.
