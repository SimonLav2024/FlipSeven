(() => {
    const META_PUNTOS = 200;
    const MAX_NUMEROS_RONDA = 7;
    const BONUS_FLIP_SEVEN = 15;
    const MIN_NUMERO = 0;
    const MAX_NUMERO = 12;

    // Estado de la partida
    let jugadores = []; // { nombre, total }
    let turnoActual = 0;
    let numerosRonda = []; // números sacados en la ronda actual del jugador en turno
    let comodinesRonda = []; // cartas comodín de la ronda actual: { etiqueta, tipo: 'bonus'|'multiplicador', valor }

    // Referencias al DOM
    const seccionJugadores = document.getElementById('seccion-jugadores');
    const seccionPartida = document.getElementById('seccion-partida');
    const seccionGanador = document.getElementById('seccion-ganador');

    const formJugador = document.getElementById('form-jugador');
    const inputNombre = document.getElementById('input-nombre');
    const listaJugadores = document.getElementById('lista-jugadores');
    const btnEmpezar = document.getElementById('btn-empezar');
    const mensajeJugadores = document.getElementById('mensaje-jugadores');

    const nombreTurno = document.getElementById('nombre-turno');
    const formNumero = document.getElementById('form-numero');
    const inputNumero = document.getElementById('input-numero');
    const mensajeRonda = document.getElementById('mensaje-ronda');
    const listaNumerosRonda = document.getElementById('lista-numeros-ronda');
    const valorSubtotalNumeros = document.getElementById('valor-subtotal-numeros');
    const botonesTecla = document.querySelectorAll('.btn-tecla[data-digito]');
    const btnBorrarDigito = document.getElementById('btn-borrar-digito');
    const btnLimpiarDigitos = document.getElementById('btn-limpiar-digitos');
    const botonesComodin = document.querySelectorAll('.btn-comodin');
    const listaComodinesRonda = document.getElementById('lista-comodines-ronda');
    const valorSubtotal = document.getElementById('valor-subtotal');
    const btnPlantarse = document.getElementById('btn-plantarse');
    const btnRepetido = document.getElementById('btn-repetido');
    const contenedorBotonesBloqueo = document.getElementById('botones-bloqueo');
    const cuerpoMarcador = document.getElementById('cuerpo-marcador');
    const btnReiniciar = document.getElementById('btn-reiniciar');

    const mensajeGanador = document.getElementById('mensaje-ganador');
    const btnNuevaPartida = document.getElementById('btn-nueva-partida');

    const modalFlipSeven = document.getElementById('modal-flip-seven');
    const mensajeFlipSeven = document.getElementById('mensaje-flip-seven');
    const btnCerrarFlipSeven = document.getElementById('btn-cerrar-flip-seven');

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

        const existe = jugadores.some((jugador) => jugador.nombre.toLowerCase() === nombre.toLowerCase());
        if (existe) {
            mensajeJugadores.textContent = 'Ese nombre ya está en la lista.';
            return;
        }

        jugadores.push({ nombre, total: 0, bloqueado: false });
        inputNombre.value = '';
        inputNombre.focus();
        renderListaJugadores();
    });

    btnEmpezar.addEventListener('click', () => {
        if (jugadores.length < 2) {
            return;
        }
        turnoActual = 0;
        seccionJugadores.classList.add('oculto');
        seccionPartida.classList.remove('oculto');
        actualizarTurno();
        renderMarcador();
    });

    function actualizarTurno() {
        const jugador = jugadores[turnoActual];
        nombreTurno.textContent = jugador.nombre;
        numerosRonda = [];
        comodinesRonda = [];
        mensajeRonda.textContent = '';
        renderNumerosRonda();
        renderComodinesRonda();
        renderBotonesBloqueo();
        habilitarEntradaNumero(true);
        inputNumero.value = '';
        inputNumero.focus();
    }

    function renderBotonesBloqueo() {
        contenedorBotonesBloqueo.innerHTML = '';
        jugadores.forEach((jugador, indice) => {
            if (indice === turnoActual) {
                return;
            }

            const boton = document.createElement('button');
            boton.type = 'button';

            if (jugador.bloqueado) {
                boton.className = 'btn-bloqueo btn-desbloqueo';
                boton.textContent = `Desbloquear a ${jugador.nombre}`;
                boton.addEventListener('click', () => {
                    jugador.bloqueado = false;
                    mensajeRonda.textContent = `${jugador.nombre} ha sido desbloqueado y podrá jugar en su próximo turno.`;
                    renderBotonesBloqueo();
                    renderMarcador();
                });
            } else {
                boton.className = 'btn-bloqueo';
                boton.textContent = `Bloquear a ${jugador.nombre}`;
                boton.addEventListener('click', () => {
                    jugador.bloqueado = true;
                    mensajeRonda.textContent = `${jugador.nombre} ha sido bloqueado: se saltará su turno hasta que se le desbloquee.`;
                    renderBotonesBloqueo();
                    renderMarcador();
                });
            }

            contenedorBotonesBloqueo.appendChild(boton);
        });
    }

    function habilitarEntradaNumero(habilitada) {
        inputNumero.disabled = !habilitada;
        formNumero.querySelector('button[type="submit"]').disabled = !habilitada;
        botonesTecla.forEach((boton) => {
            boton.disabled = !habilitada;
        });
        btnBorrarDigito.disabled = !habilitada;
        btnLimpiarDigitos.disabled = !habilitada;
    }

    function calcularTotalesRonda() {
        const sumaNumeros = numerosRonda.reduce((suma, numero) => suma + numero, 0);
        const bonusPlano = comodinesRonda
            .filter((carta) => carta.tipo === 'bonus')
            .reduce((suma, carta) => suma + carta.valor, 0);
        const multiplicador = comodinesRonda
            .filter((carta) => carta.tipo === 'multiplicador')
            .reduce((producto, carta) => producto * carta.valor, 1);
        const total = sumaNumeros * multiplicador + bonusPlano;
        return { sumaNumeros, bonusPlano, multiplicador, total };
    }

    function actualizarTotalesRonda() {
        const { sumaNumeros, total } = calcularTotalesRonda();
        valorSubtotalNumeros.textContent = sumaNumeros;
        valorSubtotal.textContent = total;
        btnPlantarse.disabled = numerosRonda.length === 0 && comodinesRonda.length === 0;
    }

    function renderNumerosRonda() {
        listaNumerosRonda.innerHTML = '';
        numerosRonda.forEach((numero, indice) => {
            const li = document.createElement('li');

            const valor = document.createElement('span');
            valor.textContent = numero;

            const btnQuitar = document.createElement('button');
            btnQuitar.type = 'button';
            btnQuitar.textContent = '✕';
            btnQuitar.title = 'Quitar este número';
            btnQuitar.addEventListener('click', () => {
                numerosRonda.splice(indice, 1);
                mensajeRonda.textContent = '';
                renderNumerosRonda();
                habilitarEntradaNumero(true);
            });

            li.appendChild(valor);
            li.appendChild(btnQuitar);
            listaNumerosRonda.appendChild(li);
        });

        actualizarTotalesRonda();
    }

    function renderComodinesRonda() {
        listaComodinesRonda.innerHTML = '';
        comodinesRonda.forEach((carta, indice) => {
            const li = document.createElement('li');

            const valor = document.createElement('span');
            valor.textContent = carta.etiqueta;

            const btnQuitar = document.createElement('button');
            btnQuitar.type = 'button';
            btnQuitar.textContent = '✕';
            btnQuitar.title = 'Quitar esta carta';
            btnQuitar.addEventListener('click', () => {
                comodinesRonda.splice(indice, 1);
                renderComodinesRonda();
            });

            li.appendChild(valor);
            li.appendChild(btnQuitar);
            listaComodinesRonda.appendChild(li);
        });

        actualizarTotalesRonda();
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
            if (jugador.bloqueado) {
                const etiqueta = document.createElement('span');
                etiqueta.className = 'etiqueta-bloqueado';
                etiqueta.textContent = ' 🔒 bloqueado';
                celdaNombre.appendChild(etiqueta);
            }

            const celdaTotal = document.createElement('td');
            celdaTotal.textContent = jugador.total;

            fila.appendChild(celdaNombre);
            fila.appendChild(celdaTotal);
            cuerpoMarcador.appendChild(fila);
        });
    }

    botonesTecla.forEach((boton) => {
        boton.addEventListener('click', () => {
            inputNumero.value = (inputNumero.value || '') + boton.dataset.digito;
            inputNumero.focus();
        });
    });

    btnBorrarDigito.addEventListener('click', () => {
        inputNumero.value = inputNumero.value.slice(0, -1);
        inputNumero.focus();
    });

    btnLimpiarDigitos.addEventListener('click', () => {
        inputNumero.value = '';
        inputNumero.focus();
    });

    formNumero.addEventListener('submit', (evento) => {
        evento.preventDefault();

        if (numerosRonda.length >= MAX_NUMEROS_RONDA) {
            mensajeRonda.textContent = `Ya has sacado ${MAX_NUMEROS_RONDA} números, el máximo por ronda. Plántate para guardar la ronda.`;
            return;
        }

        const numero = Number(inputNumero.value);
        if (Number.isNaN(numero) || inputNumero.value.trim() === '') {
            mensajeRonda.textContent = 'Introduce un número válido.';
            return;
        }

        if (numero < MIN_NUMERO || numero > MAX_NUMERO) {
            mensajeRonda.textContent = `El número debe estar entre ${MIN_NUMERO} y ${MAX_NUMERO}.`;
            return;
        }

        if (numerosRonda.includes(numero)) {
            mensajeRonda.textContent = `Ya has sacado un ${numero} en esta ronda. No puedes repetir números: usa el botón "Número repetido" si corresponde.`;
            return;
        }

        numerosRonda.push(numero);
        mensajeRonda.textContent = '';
        renderNumerosRonda();

        if (numerosRonda.length >= MAX_NUMEROS_RONDA) {
            habilitarEntradaNumero(false);
            mensajeRonda.textContent = `Has llegado al máximo de ${MAX_NUMEROS_RONDA} números. Plántate para guardar la ronda.`;
        }

        inputNumero.value = '';
        inputNumero.focus();
    });

    botonesComodin.forEach((boton) => {
        boton.addEventListener('click', () => {
            const tipo = boton.dataset.tipo;
            const valor = Number(boton.dataset.valor);
            const etiqueta = boton.textContent.trim();
            comodinesRonda.push({ etiqueta, tipo, valor });
            renderComodinesRonda();
        });
    });

    btnPlantarse.addEventListener('click', () => {
        if (numerosRonda.length === 0 && comodinesRonda.length === 0) {
            return;
        }

        const esFlipSeven = numerosRonda.length >= MAX_NUMEROS_RONDA;
        let totalRonda = calcularTotalesRonda().total;

        if (esFlipSeven) {
            totalRonda += BONUS_FLIP_SEVEN;
        }

        const jugador = jugadores[turnoActual];
        jugador.total += totalRonda;
        renderMarcador();

        if (esFlipSeven) {
            mensajeFlipSeven.textContent = `${jugador.nombre} ha sacado los 7 números y recibe ${BONUS_FLIP_SEVEN} puntos extra. Total de la ronda: ${totalRonda} puntos.`;
            modalFlipSeven.classList.remove('oculto');
            return;
        }

        continuarTrasRonda(jugador);
    });

    btnRepetido.addEventListener('click', () => {
        const jugador = jugadores[turnoActual];
        const totalEnJuego = calcularTotalesRonda().total;
        const confirmado = window.confirm(
            `¿${jugador.nombre} ha sacado un número repetido? Se perderán los ${totalEnJuego} puntos de esta ronda.`
        );

        if (!confirmado) {
            return;
        }

        continuarTrasRonda(jugador, `${jugador.nombre} ha sacado un número repetido y pierde los puntos de esta ronda.`);
    });

    function continuarTrasRonda(jugador, mensajePrevio) {
        if (jugador.total >= META_PUNTOS) {
            mostrarGanador(jugador);
            return;
        }

        const jugadoresSaltados = avanzarTurno();
        actualizarTurno();
        renderMarcador();

        const partesMensaje = [];
        if (mensajePrevio) {
            partesMensaje.push(mensajePrevio);
        }
        if (jugadoresSaltados.length > 0) {
            const plural = jugadoresSaltados.length > 1;
            partesMensaje.push(`${jugadoresSaltados.join(', ')} sigue${plural ? 'n' : ''} bloqueado${plural ? 's' : ''} y se ${plural ? 'saltan' : 'salta'} su turno.`);
        }
        if (partesMensaje.length > 0) {
            mensajeRonda.textContent = partesMensaje.join(' ');
        }
    }

    function avanzarTurno() {
        const jugadoresSaltados = [];

        for (let paso = 1; paso <= jugadores.length; paso++) {
            const indiceCandidato = (turnoActual + paso) % jugadores.length;

            if (jugadores[indiceCandidato].bloqueado) {
                // El bloqueo persiste: se salta su turno pero sigue bloqueado hasta que se le desbloquee manualmente
                jugadoresSaltados.push(jugadores[indiceCandidato].nombre);
                continue;
            }

            turnoActual = indiceCandidato;
            return jugadoresSaltados;
        }

        // Seguridad: si todos estuvieran bloqueados, se avanza igualmente al siguiente
        turnoActual = (turnoActual + 1) % jugadores.length;
        return jugadoresSaltados;
    }

    btnCerrarFlipSeven.addEventListener('click', () => {
        modalFlipSeven.classList.add('oculto');
        continuarTrasRonda(jugadores[turnoActual]);
    });

    function mostrarGanador(jugador) {
        seccionPartida.classList.add('oculto');
        seccionGanador.classList.remove('oculto');
        mensajeGanador.textContent = `${jugador.nombre} ha ganado con ${jugador.total} puntos.`;
    }

    function reiniciarPartida() {
        jugadores = [];
        turnoActual = 0;
        numerosRonda = [];
        comodinesRonda = [];
        renderListaJugadores();
        cuerpoMarcador.innerHTML = '';
        listaNumerosRonda.innerHTML = '';
        listaComodinesRonda.innerHTML = '';
        contenedorBotonesBloqueo.innerHTML = '';
        valorSubtotalNumeros.textContent = '0';
        valorSubtotal.textContent = '0';
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
