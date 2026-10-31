(() => {
    const META_PUNTOS = 200;
    const MAX_NUMEROS_RONDA = 7;
    const BONUS_FLIP_SEVEN = 15;
    const MIN_NUMERO = 0;
    const MAX_NUMERO = 12;

    const COMODINES = [
        { etiqueta: '+2', tipo: 'bonus', valor: 2 },
        { etiqueta: '+4', tipo: 'bonus', valor: 4 },
        { etiqueta: '+6', tipo: 'bonus', valor: 6 },
        { etiqueta: '+8', tipo: 'bonus', valor: 8 },
        { etiqueta: '+10', tipo: 'bonus', valor: 10 },
        { etiqueta: 'x2', tipo: 'multiplicador', valor: 2 }
    ];

    // Estado: cada jugador lleva su propia ronda en paralelo
    // { nombre, total, numeros: [], comodines: [], mensaje: '', panel: HTMLElement }
    let jugadores = [];

    // Referencias al DOM
    const seccionJugadores = document.getElementById('seccion-jugadores');
    const seccionPartida = document.getElementById('seccion-partida');
    const seccionGanador = document.getElementById('seccion-ganador');

    const formJugador = document.getElementById('form-jugador');
    const inputNombre = document.getElementById('input-nombre');
    const listaJugadores = document.getElementById('lista-jugadores');
    const btnEmpezar = document.getElementById('btn-empezar');
    const mensajeJugadores = document.getElementById('mensaje-jugadores');

    const contenedorPaneles = document.getElementById('contenedor-paneles');
    const cuerpoMarcador = document.getElementById('cuerpo-marcador');
    const btnReiniciar = document.getElementById('btn-reiniciar');

    const mensajeGanador = document.getElementById('mensaje-ganador');
    const btnNuevaPartida = document.getElementById('btn-nueva-partida');

    const modalFlipSeven = document.getElementById('modal-flip-seven');
    const mensajeFlipSeven = document.getElementById('mensaje-flip-seven');
    const btnCerrarFlipSeven = document.getElementById('btn-cerrar-flip-seven');

    /* ---------- Alta de jugadores ---------- */

    function renderListaJugadores() {
        listaJugadores.innerHTML = '';
        jugadores.forEach((jugador, indice) => {
            const li = document.createElement('li');

            const nombre = document.createElement('span');
            nombre.textContent = jugador.nombre;

            const btnQuitar = document.createElement('button');
            btnQuitar.type = 'button';
            btnQuitar.textContent = 'Quitar';
            btnQuitar.addEventListener('click', () => {
                jugadores.splice(indice, 1);
                renderListaJugadores();
            });

            li.appendChild(nombre);
            li.appendChild(btnQuitar);
            listaJugadores.appendChild(li);
        });

        btnEmpezar.disabled = jugadores.length < 2;
        mensajeJugadores.textContent = jugadores.length < 2
            ? 'Añade al menos 2 jugadores para poder empezar.'
            : '';
    }

    formJugador.addEventListener('submit', (evento) => {
        evento.preventDefault();
        const nombre = inputNombre.value.trim();

        if (!nombre) {
            return;
        }

        const existe = jugadores.some((j) => j.nombre.toLowerCase() === nombre.toLowerCase());
        if (existe) {
            mensajeJugadores.textContent = 'Ese nombre ya está en la lista.';
            return;
        }

        jugadores.push({ nombre, total: 0, numeros: [], comodines: [], mensaje: '', panel: null });
        inputNombre.value = '';
        inputNombre.focus();
        renderListaJugadores();
    });

    btnEmpezar.addEventListener('click', () => {
        if (jugadores.length < 2) {
            return;
        }
        seccionJugadores.classList.add('oculto');
        seccionPartida.classList.remove('oculto');

        contenedorPaneles.innerHTML = '';
        jugadores.forEach((jugador) => {
            const panel = document.createElement('article');
            panel.className = 'tarjeta panel-jugador';
            jugador.panel = panel;
            contenedorPaneles.appendChild(panel);
            renderPanel(jugador);
        });
        renderMarcador();
    });

    /* ---------- Cálculos ---------- */

    function calcularTotalesRonda(jugador) {
        const sumaNumeros = jugador.numeros.reduce((suma, n) => suma + n, 0);
        const bonusPlano = jugador.comodines
            .filter((c) => c.tipo === 'bonus')
            .reduce((suma, c) => suma + c.valor, 0);
        const multiplicador = jugador.comodines
            .filter((c) => c.tipo === 'multiplicador')
            .reduce((producto, c) => producto * c.valor, 1);
        const total = sumaNumeros * multiplicador + bonusPlano;
        return { sumaNumeros, bonusPlano, multiplicador, total };
    }

    function crearBoton(texto, clase, onClick) {
        const boton = document.createElement('button');
        boton.type = 'button';
        if (clase) {
            boton.className = clase;
        }
        boton.textContent = texto;
        boton.addEventListener('click', onClick);
        return boton;
    }

    function crearListaQuitable(elementos, etiqueta, onQuitar) {
        const ul = document.createElement('ul');
        ul.className = 'lista-numeros-ronda';
        elementos.forEach((elemento, indice) => {
            const li = document.createElement('li');
            const valor = document.createElement('span');
            valor.textContent = etiqueta(elemento);
            const btnQuitar = crearBoton('✕', '', () => onQuitar(indice));
            btnQuitar.title = 'Quitar';
            li.appendChild(valor);
            li.appendChild(btnQuitar);
            ul.appendChild(li);
        });
        return ul;
    }

    /* ---------- Panel de cada jugador ---------- */

    function renderPanel(jugador) {
        const panel = jugador.panel;
        panel.innerHTML = '';

        const { sumaNumeros, total } = calcularTotalesRonda(jugador);
        const completo = jugador.numeros.length >= MAX_NUMEROS_RONDA;

        // Cabecera
        const cabecera = document.createElement('div');
        cabecera.className = 'panel-cabecera';
        const nombre = document.createElement('h3');
        nombre.className = 'panel-nombre';
        nombre.textContent = jugador.nombre;
        const totalPartida = document.createElement('span');
        totalPartida.className = 'panel-total';
        totalPartida.textContent = `${jugador.total} pts`;
        cabecera.appendChild(nombre);
        cabecera.appendChild(totalPartida);
        panel.appendChild(cabecera);

        // Números
        const etiquetaNumeros = document.createElement('p');
        etiquetaNumeros.className = 'panel-etiqueta';
        etiquetaNumeros.textContent = `Números (${jugador.numeros.length}/${MAX_NUMEROS_RONDA})`;
        panel.appendChild(etiquetaNumeros);

        const teclado = document.createElement('div');
        teclado.className = 'panel-teclado';
        for (let n = MIN_NUMERO; n <= MAX_NUMERO; n++) {
            const yaSacado = jugador.numeros.includes(n);
            const boton = crearBoton(String(n), 'btn-tecla', () => sacarNumero(jugador, n));
            boton.disabled = yaSacado || completo;
            teclado.appendChild(boton);
        }
        panel.appendChild(teclado);

        panel.appendChild(crearListaQuitable(
            jugador.numeros,
            (n) => n,
            (indice) => {
                jugador.numeros.splice(indice, 1);
                jugador.mensaje = '';
                renderPanel(jugador);
            }
        ));

        const subtotalNumeros = document.createElement('p');
        subtotalNumeros.className = 'subtotal-numeros';
        subtotalNumeros.innerHTML = 'Suma de puntos: <strong></strong>';
        subtotalNumeros.querySelector('strong').textContent = sumaNumeros;
        panel.appendChild(subtotalNumeros);

        // Comodines
        const etiquetaComodines = document.createElement('p');
        etiquetaComodines.className = 'panel-etiqueta';
        etiquetaComodines.textContent = 'Cartas comodín';
        panel.appendChild(etiquetaComodines);

        const botonesComodin = document.createElement('div');
        botonesComodin.className = 'comodines-botones';
        COMODINES.forEach((carta) => {
            const boton = crearBoton(carta.etiqueta, 'btn-comodin', () => {
                jugador.comodines.push({ ...carta });
                renderPanel(jugador);
            });
            botonesComodin.appendChild(boton);
        });
        panel.appendChild(botonesComodin);

        panel.appendChild(crearListaQuitable(
            jugador.comodines,
            (c) => c.etiqueta,
            (indice) => {
                jugador.comodines.splice(indice, 1);
                renderPanel(jugador);
            }
        ));

        // Total de la ronda
        const subtotalRonda = document.createElement('p');
        subtotalRonda.className = 'subtotal-ronda';
        subtotalRonda.innerHTML = 'Total de la ronda: <strong></strong>';
        subtotalRonda.querySelector('strong').textContent = total;
        panel.appendChild(subtotalRonda);

        // Acciones
        const sinNada = jugador.numeros.length === 0 && jugador.comodines.length === 0;
        const btnPlantarse = crearBoton('Me planto', 'btn-plantarse', () => plantarse(jugador));
        btnPlantarse.disabled = sinNada;
        panel.appendChild(btnPlantarse);

        // Mensaje
        const mensaje = document.createElement('p');
        mensaje.className = 'mensaje';
        mensaje.textContent = jugador.mensaje;
        panel.appendChild(mensaje);
    }

    function renderMarcador() {
        cuerpoMarcador.innerHTML = '';
        jugadores.forEach((jugador) => {
            const fila = document.createElement('tr');
            if (jugador.total >= META_PUNTOS) {
                fila.classList.add('fila-ganando');
            }
            const celdaNombre = document.createElement('td');
            celdaNombre.textContent = jugador.nombre;
            const celdaTotal = document.createElement('td');
            celdaTotal.textContent = jugador.total;
            fila.appendChild(celdaNombre);
            fila.appendChild(celdaTotal);
            cuerpoMarcador.appendChild(fila);
        });
    }

    /* ---------- Acciones ---------- */

    function sacarNumero(jugador, numero) {
        if (jugador.numeros.length >= MAX_NUMEROS_RONDA || jugador.numeros.includes(numero)) {
            return;
        }
        jugador.numeros.push(numero);
        jugador.mensaje = jugador.numeros.length >= MAX_NUMEROS_RONDA
            ? `Has llegado al máximo de ${MAX_NUMEROS_RONDA} números. Plántate para guardar la ronda.`
            : '';
        renderPanel(jugador);
    }

    function reiniciarRonda(jugador, mensaje) {
        jugador.numeros = [];
        jugador.comodines = [];
        jugador.mensaje = mensaje || '';
        renderPanel(jugador);
    }

    function plantarse(jugador) {
        if (jugador.numeros.length === 0 && jugador.comodines.length === 0) {
            return;
        }

        const esFlipSeven = jugador.numeros.length >= MAX_NUMEROS_RONDA;
        let totalRonda = calcularTotalesRonda(jugador).total;
        if (esFlipSeven) {
            totalRonda += BONUS_FLIP_SEVEN;
        }

        jugador.total += totalRonda;
        reiniciarRonda(jugador, `Ronda guardada: +${totalRonda} puntos.`);
        renderMarcador();

        if (esFlipSeven) {
            mensajeFlipSeven.textContent = `${jugador.nombre} ha sacado los 7 números y recibe ${BONUS_FLIP_SEVEN} puntos extra. Total de la ronda: ${totalRonda} puntos.`;
            modalFlipSeven.classList.remove('oculto');
            return;
        }

        comprobarGanador();
    }

    btnCerrarFlipSeven.addEventListener('click', () => {
        modalFlipSeven.classList.add('oculto');
        comprobarGanador();
    });

    /* ---------- Final de partida ---------- */

    function comprobarGanador() {
        const candidatos = jugadores.filter((j) => j.total >= META_PUNTOS);
        if (candidatos.length === 0) {
            return;
        }
        const ganador = candidatos.reduce((mejor, j) => (j.total > mejor.total ? j : mejor));
        seccionPartida.classList.add('oculto');
        seccionGanador.classList.remove('oculto');
        mensajeGanador.textContent = `${ganador.nombre} ha ganado con ${ganador.total} puntos.`;
    }

    function reiniciarPartida() {
        jugadores = [];
        contenedorPaneles.innerHTML = '';
        cuerpoMarcador.innerHTML = '';
        renderListaJugadores();
        seccionPartida.classList.add('oculto');
        seccionGanador.classList.add('oculto');
        modalFlipSeven.classList.add('oculto');
        seccionJugadores.classList.remove('oculto');
    }

    btnReiniciar.addEventListener('click', () => {
        if (confirm('¿Seguro que quieres reiniciar la partida? Se perderán los puntos actuales.')) {
            reiniciarPartida();
        }
    });

    btnNuevaPartida.addEventListener('click', reiniciarPartida);

    renderListaJugadores();
})();
