// Variables globales
let players = [];
let firstDealerIndex = 0;
let totalRounds = 1;
let currentRound = 1;
let currentDealer = 0;
let currentHand = 0; // 0: 1 carta, 1: 3 cartas, 2: 5 cartas, 3: 7 cartas
let cardsPerHand = [1, 3, 5, 7];
let scores = [];
let totalScores = [];
let predictions = [];
let fulfilled = [];
let currentPlayerIndex = 0;
let totalPredicted = 0;
let gamePhase = "prediction"; // prediction, results

// Elementos DOM
document.addEventListener('DOMContentLoaded', function() {
    if (!loadGameState()) {
        // Si no hay juego guardado, inicializar normalmente
        setupTabNavigation();
        initPlayerRegistration();
        initRoundConfiguration();
        initGameBoard();
    } else {
        console.log("Juego cargado desde localStorage.");
    }
});

// Inicialización de registro de jugadores
function initPlayerRegistration() {
    const addPlayerBtn = document.getElementById('add-player');
    const playersSubmitBtn = document.getElementById('players-submit');
    const playersContainer = document.getElementById('players-container');
    
    // Inicializar con 2 jugadores por defecto si no hay ninguno
    if (playersContainer.children.length === 0) {
        addPlayerInput('Jugador 1');
        addPlayerInput('Jugador 2');
    }
    // Evento para agregar jugador
    addPlayerBtn.addEventListener('click', function() {
        const playerInputs = document.querySelectorAll('.player-name');
        const newIndex = playerInputs.length + 1;
        
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-input';
        playerDiv.innerHTML = `
            <input type="text" placeholder="Jugador ${newIndex}" class="player-name">
            <button class="remove-player" title="Eliminar jugador">✕</button>
        `;
        playersContainer.appendChild(playerDiv);
        const currentNames = Array.from(document.querySelectorAll('.player-name')).map(input => input.value);
        updateFirstDealerOptions(currentNames);
        
        // Evento para eliminar jugador
        setupRemovePlayerButton(playerDiv.querySelector('.remove-player'));
    });
    
    // Configurar botones de eliminar existentes
    document.querySelectorAll('.remove-player').forEach(btn => {
        setupRemovePlayerButton(btn);
    });
    
    // Función auxiliar para añadir un input de jugador
    function addPlayerInput(placeholder) {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-input';
        playerDiv.innerHTML = `<input type="text" placeholder="${placeholder}" class="player-name"><button class="remove-player" title="Eliminar jugador">✕</button>`;
        playersContainer.appendChild(playerDiv);
        setupRemovePlayerButton(playerDiv.querySelector('.remove-player'));
    }

    // Función auxiliar para configurar el botón de eliminar
    function setupRemovePlayerButton(btn) {
        btn.addEventListener('click', function() {
            if (document.querySelectorAll('.player-name').length > 2) {
                this.parentElement.remove();
                const currentNames = Array.from(document.querySelectorAll('.player-name')).map(input => input.value);
                updateFirstDealerOptions(currentNames);
            } else {
                showError('player-error', 'Se necesitan al menos 2 jugadores');
            }
        });
    }

    // Escuchar cambios en los nombres de los jugadores para actualizar el selector del repartidor
    playersContainer.addEventListener('input', function(event) {
        if (event.target.classList.contains('player-name')) {
            const currentNames = Array.from(document.querySelectorAll('.player-name')).map(input => input.value);
            updateFirstDealerOptions(currentNames);
        }
    });
    
    // Evento para enviar jugadores
    playersSubmitBtn.addEventListener('click', function() {
        const playerInputs = document.querySelectorAll('.player-name');
        const playerNames = Array.from(playerInputs).map(input => input.value.trim());
        
        // Validar que todos los jugadores tengan nombres
        if (playerNames.some(name => name === '')) {
            showError('player-error', 'Todos los jugadores deben tener un nombre');
            return;
        }
        
        // Validar que haya al menos 2 jugadores
        if (playerNames.length < 2) {
            showError('player-error', 'Se necesitan al menos 2 jugadores');
            return;
        }
        
        // Validar nombres únicos
        const uniqueNames = new Set(playerNames);
        if (uniqueNames.size !== playerNames.length) {
            showError('player-error', 'Los nombres de los jugadores deben ser únicos');
            return;
        }
        
        // Guardar jugadores y actualizar opciones de repartidor
        players = playerNames;
        updateFirstDealerOptions(players);
        firstDealerIndex = parseInt(document.getElementById('first-dealer').value);
        currentDealer = firstDealerIndex;
        
        // Avanzar a configuración de rondas
        navigateToTab('round-configuration');
        saveGameState();
    });
}

function validateMinimumPlayers() {
    const playerInputs = document.querySelectorAll('.player-name');
    if (playerInputs.length < 2) {
        showError('player-error', 'Se necesitan al menos 2 jugadores');
    } else {
        clearError('player-error');
    }
}

// Actualizar opciones del selector de primer repartidor
function updateFirstDealerOptions(playerNames) {
    const firstDealerSelect = document.getElementById('first-dealer');
    firstDealerSelect.innerHTML = ''; // Clear existing options

    playerNames.forEach((player, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = player.trim() !== '' ? player : `Jugador ${index + 1}`;
        firstDealerSelect.appendChild(option);
    });

    // Establecer la selección por defecto al primer jugador
    if (playerNames.length > 0) {
        firstDealerSelect.value = 0;
    }
}

// Inicialización de configuración de rondas
function initRoundConfiguration() {
    const roundsInput = document.getElementById('rounds');
    const roundsSubmitBtn = document.getElementById('rounds-submit');
    const firstDealerSelect = document.getElementById('first-dealer');
    
    // Populate the first dealer dropdown
    firstDealerSelect.innerHTML = ''; // Clear existing options
    players.forEach((player, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = player;
        firstDealerSelect.appendChild(option);
    });
    firstDealerSelect.value = firstDealerIndex; // Set default selection

    // Actualizar resumen al cambiar el número de rondas
    roundsInput.addEventListener('input', updateRoundSummary);
    
    // Inicializar resumen
    updateRoundSummary();
    
    // Evento para enviar configuración de rondas
    roundsSubmitBtn.addEventListener('click', function() {
        const rounds = parseInt(roundsInput.value);
        
        if (rounds < 1) {
            showError('round-error', 'Debe haber al menos 1 ronda');
            return;
        }
        
        // Guardar configuración
        totalRounds = rounds * players.length; // Adjust total rounds
        firstDealerIndex = parseInt(firstDealerSelect.value); // Update first dealer
        currentDealer = firstDealerIndex;
        
        // Inicializar arrays de puntuaciones
        initializeScores();
        
        // Avanzar al tablero de juego
        navigateToTab('game-board');
        
        // Inicializar tablero
        updateGameInfo();
        initializeRound();
        lockGameConfig(true); // Bloquear configuración
        saveGameState();
    });
}

// Actualizar resumen de rondas
function updateRoundSummary() {
    const rounds = parseInt(document.getElementById('rounds').value) || 1;
    
    document.getElementById('rounds-per-player').textContent = rounds;
    document.getElementById('total-hands').textContent = rounds * 4;
    document.getElementById('estimated-time').textContent = Math.round(rounds * 4 * 5);
}

// Inicializar arrays de puntuaciones
function initializeScores() {
    scores = Array(totalRounds * 4).fill().map(() => Array(players.length).fill(0));
    totalScores = Array(players.length).fill(0);
    
    // Inicializar tabla de puntuaciones
    initializeScoreTable();
}

// Inicializar tabla de puntuaciones
function initializeScoreTable() {
    const tableHeader = document.getElementById('score-table-header');
    const tableBody = document.getElementById('score-table-body');
    
    // Limpiar tabla
    while (tableHeader.children.length > 1) {
        tableHeader.removeChild(tableHeader.lastChild);
    }
    
    tableBody.innerHTML = '';
    
    // Agregar encabezados de jugadores
    players.forEach(player => {
        const th = document.createElement('th');
        th.textContent = player;
        tableHeader.appendChild(th);
    });
    
    // Fila de totales (primero)
    const totalRow = document.createElement('tr');
    totalRow.className = 'total-row';
    
    const totalLabelCell = document.createElement('td');
    totalLabelCell.textContent = 'Total';
    totalRow.appendChild(totalLabelCell);
    
    players.forEach((_, playerIndex) => {
        const cell = document.createElement('td');
        cell.id = `total-score-${playerIndex}`;
        cell.textContent = '0';
        totalRow.appendChild(cell);
    });
    
    tableBody.appendChild(totalRow);
    
    // Crear filas para cada mano
    for (let r = 1; r <= totalRounds; r++) {
        for (let h = 0; h < 4; h++) {
            const index = (r - 1) * 4 + h;
            const cards = cardsPerHand[h];
            
            const row = document.createElement('tr');
            row.id = `score-row-${index}`;
            
            // Columna de ronda con nombre del repartidor y cartas
            const roundCell = document.createElement('td');
            const dealerName = players[(firstDealerIndex + r - 1) % players.length];
            roundCell.innerHTML = `<strong>${dealerName}</strong><br>(${cards} ${cards === 1 ? 'carta' : 'cartas'})`;
            row.appendChild(roundCell);
            
            // Columnas de jugadores
            players.forEach((_, playerIndex) => {
                const cell = document.createElement('td');
                cell.id = `score-${index}-${playerIndex}`;
                cell.textContent = '-';
                row.appendChild(cell);
            });
            
            tableBody.appendChild(row);
        }
    }
}

// Inicialización del tablero de juego
function initGameBoard() {
    const playHandBtn = document.getElementById('play-hand');
    const saveResultsBtn = document.getElementById('save-results');
    const nextHandBtn = document.getElementById('next-hand');
    const newGameBtn = document.getElementById('new-game');
    const endGameBtn = document.getElementById('end-game-btn');
    
    // Evento para jugar mano
    playHandBtn.addEventListener('click', function() {
        // Cambiar a fase de resultados
        gamePhase = "results";
        document.getElementById('predictions-section').classList.add('hidden'); // Ocultar sección de predicciones
        document.getElementById('results-section').classList.remove('hidden'); // Mostrar sección de resultados
        
        // Actualizar información del juego
        document.getElementById('current-phase').textContent = 'Resultados';
        document.getElementById('result-cards').textContent = cardsPerHand[currentHand];
        
        // Inicializar sección de resultados
        initializeResultsSection();
    });
    
    // Evento para guardar resultados
    saveResultsBtn.addEventListener('click', function() {
        // Validar que no todos los jugadores cumplan
        const allFulfilled = fulfilled.every(status => status === true);
        if (allFulfilled && players.length > 1) {
            showError('result-error', 'No todos los jugadores pueden cumplir su predicción en la misma mano.');
            return;
        }
        clearError('result-error');
        // Calcular y guardar puntuaciones
        calculateAndSaveScores();
        
        // Actualizar tabla de puntuaciones y mostrar botón de siguiente mano
        updateScoreTable();
        
        // Habilitar botón de siguiente mano
        nextHandBtn.disabled = false;
        saveGameState();
    });
    
    // Evento para siguiente mano
    nextHandBtn.addEventListener('click', function() {
        // Avanzar a la siguiente mano o ronda
        advanceToNextHand();
    });
    
    // Evento para nuevo juego
    newGameBtn.addEventListener('click', function() {
        showConfirmationModal('¿Estás seguro de que quieres empezar un nuevo juego? Se borrarán los datos de la partida actual.', resetGame);
    });

    // Evento para finalizar partida actual
    endGameBtn.addEventListener('click', function() {
        showConfirmationModal('¿Estás seguro de que quieres finalizar la partida actual? Se perderá todo el progreso.', resetGame);
    });
}

// Inicializar ronda actual
function initializeRound() {
    // Reiniciar variables
    predictions = Array(players.length).fill(-1);
    fulfilled = Array(players.length).fill(false);
    currentPlayerIndex = (currentDealer + 1) % players.length;
    totalPredicted = 0;
    gamePhase = "prediction";
    
    // Actualizar información del juego
    updateGameInfo();
    
    // Inicializar sección de predicciones
    initializePredictionsSection();
    // Scroll to the top of the predictions section
    const predictionsSection = document.getElementById('predictions-section');
    predictionsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    document.getElementById('prediction-cards').textContent = cardsPerHand[currentHand];
    document.getElementById('all-predicted').classList.add('hidden'); // Hide green message
}

// Actualizar información del juego
function updateGameInfo() {
    document.getElementById('current-round').textContent = currentRound;
    document.getElementById('total-rounds').textContent = totalRounds;
    document.getElementById('current-hand-cards').textContent = cardsPerHand[currentHand];
    document.getElementById('current-dealer').textContent = players[currentDealer];
    document.getElementById('current-phase').textContent = gamePhase === "prediction" ? 'Predicciones' : 'Resultados';
    
    // Resaltar fila actual en la tabla
    const currentIndex = (currentRound - 1) * 4 + currentHand;
    document.querySelectorAll('#score-table-body tr').forEach(row => {
        row.classList.remove('current-row');
    });
    
    const currentRow = document.getElementById(`score-row-${currentIndex}`);
    if (currentRow) {
        currentRow.classList.add('current-row');
        currentRow.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Scroll to current row
    }
}

// Inicializar sección de predicciones
function initializePredictionsSection() {
    const predictionsContainer = document.getElementById('predictions-container');
    predictionsContainer.innerHTML = ''; // Clear container to avoid unintended elements

    const playingOrder = getPlayingOrder();
    playingOrder.forEach(playerIndex => {
        const isCurrentPlayer = (playerIndex === currentPlayerIndex && predictions[playerIndex] === -1);
        const hasPredicted = predictions[playerIndex] !== -1;


        const playerRow = document.createElement('div');
        playerRow.className = 'player-row';
        playerRow.id = `prediction-row-${playerIndex}`;

        const playerName = document.createElement('div');
        playerName.className = 'player-name-display';
        playerName.textContent = players[playerIndex];

        if (playerIndex === currentDealer) {
            const dealerTag = document.createElement('span');
            dealerTag.className = 'dealer-tag';
            dealerTag.textContent = '(Repartidor)';
            playerName.appendChild(dealerTag);
        }

        playerRow.appendChild(playerName);

        if (isCurrentPlayer) {
            playerRow.classList.add('current-player');
            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'prediction-button-group';

            let forbiddenPrediction = -1; // -1 significa que no hay número prohibido
            // Comprobar si el jugador actual es el repartidor y es el último en predecir
            if (playerIndex === currentDealer) {
                const predictionsMadeCount = predictions.filter(p => p !== -1).length;
                if (predictionsMadeCount === players.length - 1) {
                    const sumOfOthers = predictions.filter(p => p !== -1).reduce((sum, p) => sum + p, 0);
                    forbiddenPrediction = cardsPerHand[currentHand] - sumOfOthers;
                }
            }

            for (let i = 0; i <= cardsPerHand[currentHand]; i++) {
                if (i === forbiddenPrediction) continue; // Omitir el botón con el número prohibido

                const btn = document.createElement('button');
                btn.textContent = i;
                btn.className = 'primary-button';
                btn.addEventListener('click', () => handlePredictionInput(i));
                buttonGroup.appendChild(btn);
            }
            playerRow.appendChild(buttonGroup);
        } else if (hasPredicted) {
            const predictionDisplay = document.createElement('div');
            predictionDisplay.className = 'prediction-display';
            predictionDisplay.textContent = predictions[playerIndex];
            playerRow.appendChild(predictionDisplay);
        } else {
            const predictionDisplay = document.createElement('div');
            predictionDisplay.className = 'prediction-display prediction-pending';
            predictionDisplay.textContent = 'Pendiente';
            playerRow.appendChild(predictionDisplay);
        }
        
        // Actualizar info del jugador actual
        document.getElementById('current-player-name').textContent = players[currentPlayerIndex];

        predictionsContainer.appendChild(playerRow);
    });
}

// Obtener orden de juego
function getPlayingOrder() {
    const order = [];
    for (let i = 0; i < players.length; i++) {
        const playerIndex = (currentDealer + 1 + i) % players.length;
        order.push(playerIndex);
    }
    return order;
}

// Manejar input de predicción
function handlePredictionInput(value) {
    const prediction = parseInt(value);
    
    // Validar predicción
    if (isNaN(prediction) || prediction < 0 || prediction > cardsPerHand[currentHand]) {
        showError('prediction-error', `La predicción debe estar entre 0 y ${cardsPerHand[currentHand]}`);
        return;
    }
    
    // Regla especial para el repartidor (último jugador en predecir)
    if (currentPlayerIndex === currentDealer) {
        const sumPredictions = totalPredicted + prediction;
        if (sumPredictions === cardsPerHand[currentHand] && players.length > 1) { // Only apply if there's more than one player
            showError('prediction-error', `El repartidor no puede pedir ${prediction} porque la suma total de predicciones sería igual a ${cardsPerHand[currentHand]} (cartas en juego).`);
            return;
        }
    }
    
    // Limpiar error
    clearError('prediction-error');

    // Guardar la predicción
    predictions[currentPlayerIndex] = prediction;
    totalPredicted = predictions.filter(p => p !== -1).reduce((sum, p) => sum + p, 0);

    // Mover al siguiente jugador
    const playingOrder = getPlayingOrder();
    const currentOrderIndex = playingOrder.indexOf(currentPlayerIndex);
    
    // Actualizar contador de predicciones hechas
    document.getElementById('predictions-made').textContent = predictions.filter(p => p !== -1).length;

    
    if (currentOrderIndex < playingOrder.length - 1) {
        // Mover al siguiente jugador
        currentPlayerIndex = playingOrder[currentOrderIndex + 1];
        
        // Actualizar información del jugador actual
        document.getElementById('current-player-name').textContent = players[currentPlayerIndex];
        initializePredictionsSection();
    } else {
        // Todas las predicciones hechas
        document.getElementById('current-player-info').classList.add('hidden');
        document.getElementById('all-predicted').classList.remove('hidden');
        document.getElementById('play-hand').classList.remove('hidden');
        
        // Actualizar información de predicciones totales
        document.getElementById('total-predicted').textContent = predictions.filter(p => p !== -1).reduce((sum, p) => sum + p, 0);
        document.getElementById('max-possible').textContent = cardsPerHand[currentHand]; // Mostrar la cantidad posible correcta
        saveGameState();
    }
}

// Inicializar sección de resultados
function initializeResultsSection() {
    const resultsContainer = document.getElementById('results-container');
    const saveResultsBtn = document.getElementById('save-results');
    const nextHandBtn = document.getElementById('next-hand');
    const resultError = document.getElementById('result-error');

    // Limpiar contenedor
    resultsContainer.innerHTML = '';
    clearError('result-error'); // Clear any previous error message

    // Crear filas para cada jugador en el orden de predicción
    const playingOrder = getPlayingOrder();
    playingOrder.forEach(playerIndex => { // Iterate through playing order
        const playerRow = document.createElement('div'); // Use a new class for results row
        playerRow.className = 'result-player-row';

        const playerName = document.createElement('div');
        playerName.className = 'player-name-display';
        playerName.textContent = players[playerIndex];

        if (playerIndex === currentDealer) {
            const dealerTag = document.createElement('span');
            dealerTag.className = 'dealer-tag';
            dealerTag.textContent = '(Repartidor)';
            playerName.appendChild(dealerTag);
        }

        const predictionInfo = document.createElement('span');
        predictionInfo.className = 'prediction-info';
        predictionInfo.textContent = `Pidió: ${predictions[playerIndex]}`;

        const fulfillmentContainer = document.createElement('div');
        fulfillmentContainer.className = 'fulfillment-container';

        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'fulfillment-buttons';

        const fulfilledBtn = document.createElement('button');
        fulfilledBtn.textContent = '✓';
        fulfilledBtn.className = 'fulfillment-btn fulfilled-true-btn secondary-button';

        const notFulfilledBtn = document.createElement('button');
        notFulfilledBtn.textContent = '✕';
        notFulfilledBtn.className = 'fulfillment-btn fulfilled-false-btn secondary-button';

        const updateButtonsState = () => {
            fulfilledBtn.classList.toggle('active', fulfilled[playerIndex] === true);
            notFulfilledBtn.classList.toggle('active', fulfilled[playerIndex] === false);
        };

        fulfilledBtn.addEventListener('click', () => {
            fulfilled[playerIndex] = true;
            updateButtonsState();
        });

        notFulfilledBtn.addEventListener('click', () => {
            fulfilled[playerIndex] = false;
            updateButtonsState();
        });

        // Set initial state (default to not fulfilled)
        fulfilled[playerIndex] = false;
        updateButtonsState();

        buttonsContainer.append(fulfilledBtn, notFulfilledBtn);
        fulfillmentContainer.appendChild(buttonsContainer);

        playerRow.append(playerName, predictionInfo, fulfillmentContainer);
        resultsContainer.appendChild(playerRow);
    });

    nextHandBtn.classList.add('hidden'); // Hide next hand button initially
    saveResultsBtn.classList.remove('hidden'); // Show save results button
    saveResultsBtn.disabled = false; // Enable save results button
}

// Calcular y guardar puntuaciones
function calculateAndSaveScores() {
    const currentIndex = (currentRound - 1) * 4 + currentHand;

    // Calcular puntuaciones
    players.forEach((_, playerIndex) => {
        if (fulfilled[playerIndex]) {
            // 5 puntos por cumplir + 1 punto por cada mano pedida
            scores[currentIndex][playerIndex] = 5 + predictions[playerIndex];
        } else {
            // 0 puntos si no cumplió
            scores[currentIndex][playerIndex] = 0;
        }

        // Actualizar puntuación total
        totalScores[playerIndex] = 0;
        for (let i = 0; i <= currentIndex; i++) {
            totalScores[playerIndex] += scores[i][playerIndex];
        }
    });

    // Ocultar botón de guardar y mostrar botón de siguiente mano
    const saveResultsBtn = document.getElementById('save-results');
    const nextHandBtn = document.getElementById('next-hand');
    saveResultsBtn.classList.add('hidden');
    nextHandBtn.classList.remove('hidden');
    nextHandBtn.disabled = false; // Ensure next hand button is enabled
}

// Actualizar tabla de puntuaciones
function updateScoreTable() {
    const currentIndex = (currentRound - 1) * 4 + currentHand;
    
    // Actualizar celdas de puntuación
    players.forEach((_, playerIndex) => {
        const cell = document.getElementById(`score-${currentIndex}-${playerIndex}`);
        cell.textContent = scores[currentIndex][playerIndex];
        
        // Actualizar total
        const totalCell = document.getElementById(`total-score-${playerIndex}`);
        totalCell.textContent = totalScores[playerIndex];
    });
}

// Avanzar a la siguiente mano o ronda
function advanceToNextHand() {
    // Cambiar a fase de predicciones
    gamePhase = "prediction";
    document.getElementById('predictions-section').classList.remove('hidden'); // Mostrar sección de predicciones
    document.getElementById('results-section').classList.add('hidden'); // Ocultar sección de resultados
    
    // Avanzar a la siguiente mano o ronda
    if (currentHand === 3) {
        // Fin de una ronda (después de la mano de 7 cartas)
        if (currentRound === totalRounds) {
            // Fin del juego
            endGame();
            return;
        } else {
            // Siguiente ronda
            currentRound++;
            currentHand = 0;
            currentDealer = (currentDealer + 1) % players.length;
        }
    } else {
        // Siguiente mano en la misma ronda
        currentHand++;
    }
    
    // Inicializar nueva ronda
    initializeRound();
    saveGameState();
}

// Finalizar juego
function endGame() {
    // Mostrar pantalla de fin de juego
    navigateToTab('game-end');
    
    // Copiar tabla de puntuaciones
    saveGameState(); // Guardar el estado final
    const finalScores = document.getElementById('final-scores');
    finalScores.innerHTML = document.getElementById('score-table-section').innerHTML;
    
    // Llenar tabla de clasificación final
    const rankingTableBody = document.getElementById('ranking-table-body');
    rankingTableBody.innerHTML = ''; // Limpiar tabla

    // Crear un array de jugadores con sus puntajes
    const playerScores = players.map((player, index) => ({
        name: player,
        score: totalScores[index]
    }));

    // Ordenar jugadores por puntaje descendente
    playerScores.sort((a, b) => b.score - a.score);

    // Agregar filas a la tabla
    playerScores.forEach(playerScore => {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        const scoreCell = document.createElement('td');

        nameCell.textContent = playerScore.name;
        scoreCell.textContent = playerScore.score;

        row.appendChild(nameCell);
        row.appendChild(scoreCell);
        rankingTableBody.appendChild(row);
    });

    // Mostrar el ganador
    const maxScore = playerScores[0].score;
    const winnerName = playerScores[0].name;
    const gameEndHeader = document.querySelector('#game-end h2');
    gameEndHeader.textContent = `¡Juego Terminado! Ganador: ${winnerName}`;
}

// Reiniciar juego
function resetGame() {
    // Reiniciar variables
    players = [];
    firstDealerIndex = 0;
    totalRounds = 1;
    currentRound = 1;
    currentDealer = 0;
    currentHand = 0;
    scores = [];
    totalScores = [];
    predictions = [];
    fulfilled = [];
    currentPlayerIndex = 0;
    totalPredicted = 0;
    gamePhase = "prediction";
    
    // Volver a la pantalla de registro de jugadores
    navigateToTab('player-registration');
    
    // Limpiar campos
    document.querySelectorAll('.player-name').forEach((input, index) => {
        if (index < 3) {
            input.value = '';
        } else {
            input.parentElement.remove();
        }
    });
    
    document.getElementById('first-dealer').value = '0';
    document.getElementById('rounds').value = '1';
    
    // Limpiar errores
    clearError('player-error');
    clearError('round-error');
    clearError('prediction-error');
    clearError('result-error');
    // Limpiar estado guardado
    localStorage.removeItem('podridaGameState');
    // Desbloquear configuración
    lockGameConfig(false);
}

// Mostrar mensaje de error
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
}

// Limpiar mensaje de error
function clearError(elementId) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = '';
    errorElement.classList.add('hidden');
}

function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => navigateToTab(button.getAttribute('data-tab')));
    });

    // Asegurarse de que la pestaña inicial esté activa
    const initialActiveTab = document.querySelector('.tab-content.active');
    if (initialActiveTab) {
        const tabId = initialActiveTab.id;
        const correspondingButton = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        if (correspondingButton) {
            correspondingButton.classList.add('active');
        }
    }
}

function navigateToTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active')); // Desactiva todos los botones
    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden')); // Oculta todos los contenidos

    document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active'); // Activa el botón correcto
    document.getElementById(tabId).classList.remove('hidden'); // Muestra el contenido correcto
}

// Bloquear/Desbloquear la configuración del juego
function lockGameConfig(lock) {
    const playerTab = document.querySelector('.tab-btn[data-tab="player-registration"]');
    const roundTab = document.querySelector('.tab-btn[data-tab="round-configuration"]');
    
    playerTab.disabled = lock;
    roundTab.disabled = lock;

    const playerInputs = document.querySelectorAll('#player-registration input, #player-registration button');
    const roundInputs = document.querySelectorAll('#round-configuration input, #round-configuration select, #round-configuration button');

    playerInputs.forEach(el => el.disabled = lock);
    roundInputs.forEach(el => el.disabled = lock);
}

// --- Modal de Confirmación ---
function showConfirmationModal(message, onConfirm) {
    const modal = document.getElementById('confirmation-modal');
    const messageEl = document.getElementById('modal-message');
    const confirmBtn = document.getElementById('modal-confirm');
    const cancelBtn = document.getElementById('modal-cancel');

    messageEl.textContent = message;
    modal.classList.remove('hidden');

    const confirmHandler = () => {
        onConfirm();
        hideModal();
    };

    const hideModal = () => {
        modal.classList.add('hidden');
        confirmBtn.removeEventListener('click', confirmHandler);
        cancelBtn.removeEventListener('click', hideModal);
    };

    confirmBtn.addEventListener('click', confirmHandler);
    cancelBtn.addEventListener('click', hideModal);
}

// --- Persistencia de Datos ---

function saveGameState() {
    const gameState = {
        players,
        firstDealerIndex,
        totalRounds,
        currentRound,
        currentDealer,
        currentHand,
        scores,
        totalScores,
        predictions,
        fulfilled,
        currentPlayerIndex,
        totalPredicted,
        gamePhase,
        activeTab: document.querySelector('.tab-content:not(.hidden)').id
    };
    localStorage.setItem('podridaGameState', JSON.stringify(gameState));
}

function loadGameState() {
    const savedState = localStorage.getItem('podridaGameState');
    if (!savedState) {
        return false;
    }

    const gameState = JSON.parse(savedState);

    // Restaurar variables globales
    players = gameState.players || [];
    if (players.length === 0) return false; // No hay juego que cargar

    firstDealerIndex = gameState.firstDealerIndex;
    totalRounds = gameState.totalRounds;
    currentRound = gameState.currentRound;
    currentDealer = gameState.currentDealer;
    currentHand = gameState.currentHand;
    scores = gameState.scores;
    totalScores = gameState.totalScores;
    predictions = gameState.predictions;
    fulfilled = gameState.fulfilled;
    currentPlayerIndex = gameState.currentPlayerIndex;
    totalPredicted = gameState.totalPredicted;
    gamePhase = gameState.gamePhase;

    // Reconstruir la UI
    rehydrateUI(gameState.activeTab);

    return true;
}

function rehydrateUI(activeTab) {
    // Inicializar eventos y navegación
    setupTabNavigation();
    initPlayerRegistration();
    initRoundConfiguration();
    initGameBoard();

    // Re-poblar registro de jugadores
    const playersContainer = document.getElementById('players-container');
    playersContainer.innerHTML = '';
    players.forEach(name => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-input';
        playerDiv.innerHTML = `<input type="text" value="${name}" class="player-name"><button class="remove-player" title="Eliminar jugador">✕</button>`;
        playersContainer.appendChild(playerDiv);
        playerDiv.querySelector('.remove-player').addEventListener('click', function() {
            if (document.querySelectorAll('.player-name').length > 2) {
                this.parentElement.remove();
            }
        });
    });

    // Re-poblar configuración de rondas
    document.getElementById('rounds').value = totalRounds / players.length;
    updateFirstDealerOptions(players);
    document.getElementById('first-dealer').value = firstDealerIndex;
    updateRoundSummary();

    // Reconstruir estado del juego si ya había empezado
    if (activeTab === 'game-board' || activeTab === 'game-end') {
        initializeScoreTable();
        for (let i = 0; i < (currentRound - 1) * 4 + currentHand; i++) {
            players.forEach((_, pIndex) => {
                document.getElementById(`score-${i}-${pIndex}`).textContent = scores[i][pIndex];
            });
        }
        updateScoreTable(); // Actualiza los totales
        updateGameInfo();
        if (gamePhase === 'prediction') initializePredictionsSection();
        if (gamePhase === 'results') initializeResultsSection();
    }
    if (activeTab === 'game-end') endGame();

    navigateToTab(activeTab);
}