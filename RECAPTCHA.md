# Login con reCAPTCHA v2

Completar `RECAPTCHA_SITE_KEY` y `RECAPTCHA_SECRET_KEY` en `.env` con las claves de reCAPTCHA v2 (casilla «No soy un robot») y reiniciar la aplicación. Registrar el dominio de producción y localhost si se prueba localmente. La clave secreta nunca se envía al navegador.

Tras dos errores de credenciales desde una IP, el siguiente intento exige captcha. El servidor valida el token con Google antes de autenticar. Un login correcto borra el contador; los fallos vencen a los 15 minutos del último error. Recargar la página conserva el requisito. Las personas que comparten IP comparten el contador.

La tabla `login_attempts` se crea automáticamente al consultar la protección por primera vez: el usuario MySQL necesita permiso CREATE. Los contadores se comparten entre instancias y sobreviven a reinicios. Si falta configuración cuando se necesita captcha, falla Google o no está disponible la base, el servidor rechaza ese intento.

Si el servidor está detrás de un proxy, configurar `TRUST_PROXY` con sus IP o subredes confiables, separadas por comas, según la infraestructura. Sin esa configuración Express usa la dirección de la conexión: detrás de un proxy los visitantes podrían compartir contador. No confiar indiscriminadamente en encabezados enviados por clientes.

Pruebas automáticas: `node --test tests/loginProtection.test.js`. Usan dobles de base de datos y Google; no requieren claves ni modifican datos reales.

Comprobación manual después de configurar: fallar dos veces, verificar que aparezca la casilla, recargar, intentar sin resolverla, resolverla e ingresar correctamente. Verificar también un fallo de contraseña después de resolver el captcha: debe pedir uno nuevo.
