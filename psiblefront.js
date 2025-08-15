// En tu componente frontend (React/Vue/Angular)
function EscanerBolsones() {
    const [codigoActual, setCodigoActual] = useState('');
    const [codigosEscaneados, setCodigosEscaneados] = useState([]);
    const [ordenVenta, setOrdenVenta] = useState('');
    const inputRef = useRef(null);
  
    // Enfoque automático cuando el componente carga
    useEffect(() => {
      inputRef.current.focus();
    }, []);
  
    // Maneja el evento "Enter" (que el escáner dispara automáticamente)
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        
        // Validación básica
        if (!codigoActual) return;
        
        // Agregar a la lista temporal
        if (!codigosEscaneados.includes(codigoActual)) {
          setCodigosEscaneados([...codigosEscaneados, codigoActual]);
        }
        
        // Limpiar para el próximo escaneo
        setCodigoActual('');
        
        // Mantén el foco para el próximo escaneo
        inputRef.current.focus();
      }
    };
  
    // Enviar todos los códigos escaneados
    const enviarCodigos = async () => {
      if (codigosEscaneados.length === 0 || !ordenVenta) return;
      
      try {
        // Si quieres enviar uno por uno
        /* for (const codigo of codigosEscaneados) {
          await fetch('/api/bolsones/entregar', {
            method: 'POST',
            body: JSON.stringify({ codigo, orden_venta: ordenVenta }),
            headers: { 'Content-Type': 'application/json' }
          });
        } */
        
        // O mejor, todos a la vez con el endpoint que sugerí antes
        await fetch('/api/logistica/despacho/' + ordenVenta + '/bolsones', {
          method: 'POST',
          body: JSON.stringify({ codigos: codigosEscaneados }),
          headers: { 'Content-Type': 'application/json' }
        });
        
        // Limpiar después del éxito
        setCodigosEscaneados([]);
        alert('Bolsones escaneados correctamente');
      } catch (error) {
        alert('Error al procesar los códigos: ' + error.message);
      }
    };
  
    return (
      <div>
        <h2>Escaneo de Bolsones</h2>
        
        <div>
          <label>Orden de Venta:</label>
          <input
            type="text"
            value={ordenVenta}
            onChange={(e) => setOrdenVenta(e.target.value)}
          />
        </div>
        
        <div>
          <label>Escanear Código:</label>
          <input
            ref={inputRef}
            type="text"
            value={codigoActual}
            onChange={(e) => setCodigoActual(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escanee aquí..."
          />
        </div>
        
        <div>
          <h3>Códigos Escaneados: {codigosEscaneados.length}</h3>
          <ul>
            {codigosEscaneados.map((code, index) => (
              <li key={index}>{code}</li>
            ))}
          </ul>
        </div>
        
        <button onClick={enviarCodigos} disabled={codigosEscaneados.length === 0 || !ordenVenta}>
          Confirmar Entrega
        </button>
      </div>
    );
  }