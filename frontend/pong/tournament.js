// frontend/pong/tournament.js

// Variables globales del torneo
let tournament = null;
let addedPlayers = [];

// DOM elements
let tournamentSetup, tournamentBracket, matchAnnouncement, winnerScreen;

// Función principal para inicializar el torneo
function initTournament() {
	// Obtener referencias DOM
	tournamentSetup = document.getElementById('tournamentSetup');
	tournamentBracket = document.getElementById('tournamentBracket');
	matchAnnouncement = document.getElementById('matchAnnouncement');
	winnerScreen = document.getElementById('winnerScreen');

	// Setup event listeners
	setupTournamentEventListeners();

	// Verificar si regresamos de un juego con resultado
	checkGameResult();

	console.log("🏆 Sistema de torneo inicializado");
}

// Event listeners del torneo
function setupTournamentEventListeners() {
	// Setup screen
	document.getElementById('addPlayer').addEventListener('click', addPlayer);
	document.getElementById('startTournament').addEventListener('click', startTournament);
	document.getElementById('playerAlias').addEventListener('keypress', function(e) {
		if (e.key === 'Enter') addPlayer();
	});
	document.getElementById('userAlias').addEventListener('input', updateStartButton);

	// Navigation
	document.getElementById('newTournamentFromBracket').addEventListener('click', resetTournament);
	document.getElementById('backToBracketFromAnnouncement').addEventListener('click', showBracket);
	document.getElementById('startGameBtn').addEventListener('click', startPongMatch);
	document.getElementById('newTournament').addEventListener('click', resetTournament);
	document.getElementById('backToMenuFromWinner').addEventListener('click', () => {
		window.location.href = '/dashboard';
	});
}

// Verificar si regresamos de un juego completado
function checkGameResult() {
	const urlParams = new URLSearchParams(window.location.search);
	const gameResult = urlParams.get('result');
	
	if (gameResult) {
		console.log("🏆 Regresando del juego con resultado:", gameResult);
		
		// Limpiar URL
		window.history.replaceState({}, document.title, window.location.pathname);
		
		// Cargar torneo desde sessionStorage
		const tournamentData = sessionStorage.getItem('tournamentData');
		if (tournamentData) {
			tournament = JSON.parse(tournamentData);
			
			// Procesar resultado del juego
			processGameResult(gameResult);
			
			// Mostrar bracket actualizado
			showBracket();
		}
	}
}

// Procesar resultado del juego
function processGameResult(resultString) {
	if (!tournament) return;
	
	// Parse del resultado: "winner:player1,score1:5,score2:3"
	const resultData = {};
	resultString.split(',').forEach(pair => {
		const [key, value] = pair.split(':');
		resultData[key] = value;
	});
	
	const winner = resultData.winner;
	const score1 = parseInt(resultData.score1) || 0;
	const score2 = parseInt(resultData.score2) || 0;
	
	console.log("🏆 Resultado procesado:", { winner, score1, score2 });
	
	// Encontrar el match actual
	const currentMatch = tournament.matches[tournament.currentMatchIndex];
	if (!currentMatch) return;
	
	// Establecer ganador
	if (winner === 'player1') {
		currentMatch.winner = currentMatch.player1;
	} else {
		currentMatch.winner = currentMatch.player2;
	}
	
	console.log("🎯 Ganador del match:", currentMatch.winner);
	
	// Actualizar siguiente ronda
	updateNextRound(currentMatch);
	
	// Avanzar al siguiente match
	tournament.currentMatchIndex++;
	
	// Verificar si el torneo terminó
	const remainingMatches = tournament.matches.filter(m => canPlayMatch(m));
	
	if (remainingMatches.length === 0) {
		// Buscar el ganador del torneo (ganador de la final)
		const finalMatch = tournament.matches.find(m => m.round === 3);
		tournament.isComplete = true;
		tournament.winner = finalMatch.winner;
		
		console.log("🏆 ¡Torneo completado! Ganador:", tournament.winner);
		
		// Mostrar pantalla de ganador
		setTimeout(() => {
			showTournamentWinner();
		}, 2000);
	}
	
	// Guardar estado actualizado
	sessionStorage.setItem('tournamentData', JSON.stringify(tournament));
}

// Agregar jugador al torneo
function addPlayer() {
	const input = document.getElementById('playerAlias');
	const alias = input.value.trim();
	
	if (!alias) {
		alert('Por favor ingresa un alias');
		return;
	}
	
	if (addedPlayers.length >= 7) {
		alert('Máximo 7 jugadores');
		return;
	}
	
	if (addedPlayers.includes(alias)) {
		alert('Este alias ya está añadido');
		return;
	}

	// Verificar que no sea igual al alias del usuario
	const userAlias = document.getElementById('userAlias').value.trim();
	if (userAlias && alias.toLowerCase() === userAlias.toLowerCase()) {
		alert('No puedes usar tu mismo alias');
		return;
	}

	addedPlayers.push(alias);
	input.value = '';
	updatePlayersList();
	updateStartButton();
}

// Remover jugador
function removePlayer(alias) {
	addedPlayers = addedPlayers.filter(p => p !== alias);
	updatePlayersList();
	updateStartButton();
}

// Actualizar lista de jugadores
function updatePlayersList() {
	const list = document.getElementById('playersList');
	const count = document.getElementById('playerCount');
	
	count.textContent = addedPlayers.length;
	list.innerHTML = addedPlayers.map(alias => 
		`<div class="player-item">
			<span>${alias}</span>
			<button class="btn-small" onclick="removePlayer('${alias}')">
				Eliminar
			</button>
		</div>`
	).join('');
}

// Actualizar botón de iniciar
function updateStartButton() {
	const userAlias = document.getElementById('userAlias').value.trim();
	const btn = document.getElementById('startTournament');
	btn.disabled = !(userAlias && addedPlayers.length === 7);
}

// Iniciar torneo
function startTournament() {
	const userAlias = document.getElementById('userAlias').value.trim();
	
	if (!userAlias) {
		alert('Debes ingresar tu alias');
		return;
	}

	if (addedPlayers.length !== 7) {
		alert('Necesitas exactamente 7 oponentes');
		return;
	}

	// Crear estructura del torneo
	const players = [
		{ id: 0, alias: userAlias, isUser: true },
		...addedPlayers.map((alias, index) => ({
			id: index + 1,
			alias: alias,
			isUser: false
		}))
	];

	// Shuffle jugadores
	const shuffledPlayers = shuffleArray(players);

	// Generar matches
	const matches = generateMatches(shuffledPlayers);

	tournament = {
		players: shuffledPlayers,
		matches: matches,
		currentMatchIndex: 0,
		isComplete: false,
		winner: null
	};

	// Guardar en sessionStorage
	sessionStorage.setItem('tournamentData', JSON.stringify(tournament));

	console.log("🏆 Torneo creado:", tournament);

	// Cambiar a vista de bracket
	tournamentSetup.style.display = 'none';
	tournamentBracket.style.display = 'block';
	
	renderBracket();
}

// Shuffle array
function shuffleArray(array) {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

// Generar matches de eliminación simple
function generateMatches(players) {
	const matches = [];
	let matchId = 1;

	// Ronda 1: 4 matches (8 -> 4 jugadores)
	for (let i = 0; i < 4; i++) {
		matches.push({
			id: matchId++,
			player1: players[i * 2],
			player2: players[i * 2 + 1],
			round: 1,
			position: i,
			winner: null
		});
	}

	// Ronda 2: 2 matches (4 -> 2 jugadores)
	for (let i = 0; i < 2; i++) {
		matches.push({
			id: matchId++,
			player1: { id: -1, alias: 'TBD', isUser: false },
			player2: { id: -1, alias: 'TBD', isUser: false },
			round: 2,
			position: i,
			winner: null
		});
	}

	// Ronda 3: 1 match (2 -> 1 jugador)
	matches.push({
		id: matchId,
		player1: { id: -1, alias: 'TBD', isUser: false },
		player2: { id: -1, alias: 'TBD', isUser: false },
		round: 3,
		position: 0,
		winner: null
	});

	return matches;
}

// Renderizar bracket
function renderBracket() {
	const container = document.getElementById('bracketRounds');
	const rounds = [
		{ title: 'Cuartos de Final', matches: tournament.matches.filter(m => m.round === 1) },
		{ title: 'Semifinales', matches: tournament.matches.filter(m => m.round === 2) },
		{ title: 'Final', matches: tournament.matches.filter(m => m.round === 3) }
	];

	container.innerHTML = rounds.map(round => `
		<div class="bracket-round">
			<div class="round-title">${round.title}</div>
			${round.matches.map(match => `
				<div class="match-item ${getMatchStatus(match)}">
					<div class="match-players">
						<div class="player ${match.winner?.id === match.player1.id ? 'winner' : ''} ${match.player1.isUser ? 'user' : ''}">
							<span>${match.player1.alias}</span>
							${match.winner?.id === match.player1.id ? '<span>👑</span>' : ''}
						</div>
						<div class="vs-text">VS</div>
						<div class="player ${match.winner?.id === match.player2.id ? 'winner' : ''} ${match.player2.isUser ? 'user' : ''}">
							<span>${match.player2.alias}</span>
							${match.winner?.id === match.player2.id ? '<span>👑</span>' : ''}
						</div>
					</div>
					${canPlayMatch(match) ? `
						<button class="btn-play" onclick="showMatchAnnouncement(${match.id})">
							🏓 Jugar
						</button>
					` : ''}
				</div>
			`).join('')}
		</div>
	`).join('');
}

// Verificar si se puede jugar un match
function canPlayMatch(match) {
	// Solo se puede jugar si no está completado y ambos jugadores están disponibles
	return !match.winner && 
		   match.player1.alias !== 'TBD' && 
		   match.player2.alias !== 'TBD';
}

// Obtener estado del match
function getMatchStatus(match) {
	if (match.winner) return 'completed';
	
	const currentMatch = getCurrentMatch();
	if (currentMatch && currentMatch.id === match.id) return 'current';
	
	return '';
}

// Obtener match actual (primer match disponible para jugar)
function getCurrentMatch() {
	if (!tournament || tournament.isComplete) return null;
	
	// Buscar el primer match que se pueda jugar
	return tournament.matches.find(match => canPlayMatch(match)) || null;
}

// Mostrar anuncio del match
function showMatchAnnouncement(matchId) {
	const match = tournament.matches.find(m => m.id === matchId);
	if (!match) return;

	// Guardar el índice del match actual
	tournament.currentMatchIndex = tournament.matches.indexOf(match);
	sessionStorage.setItem('tournamentData', JSON.stringify(tournament));

	// Esconder bracket, mostrar anuncio
	tournamentBracket.style.display = 'none';
	matchAnnouncement.style.display = 'block';

	// Actualizar contenido del anuncio
	document.getElementById('announcementTitle').textContent = 
		`${getRoundName(match.round)} - Match ${match.id}`;

	document.getElementById('announcementPlayers').innerHTML = `
		<div class="announcement-player ${match.player1.isUser ? 'user' : ''}">
			<h3>${match.player1.alias}</h3>
			${match.player1.isUser ? '<p style="color: #00ff88;">¡Eres tú!</p>' : '<p style="color: #ccc;">Oponente</p>'}
		</div>
		<div class="vs-large">VS</div>
		<div class="announcement-player ${match.player2.isUser ? 'user' : ''}">
			<h3>${match.player2.alias}</h3>
			${match.player2.isUser ? '<p style="color: #00ff88;">¡Eres tú!</p>' : '<p style="color: #ccc;">Oponente</p>'}
		</div>
	`;
}

// Obtener nombre de ronda
function getRoundName(round) {
	switch(round) {
		case 1: return 'Cuartos de Final';
		case 2: return 'Semifinal';
		case 3: return 'Final';
		default: return `Ronda ${round}`;
	}
}

// Iniciar el match de pong real (redirigir a pong.html)
function startPongMatch() {
	if (!tournament) return;

	const currentMatch = tournament.matches[tournament.currentMatchIndex];
	if (!currentMatch) return;

	console.log("🏓 Iniciando redirección a pong.html para:", currentMatch);

	// Guardar información del match en sessionStorage
	sessionStorage.setItem('tournamentMatch', JSON.stringify({
		player1: currentMatch.player1.alias,
		player2: currentMatch.player2.alias,
		round: currentMatch.round,
		roundName: getRoundName(currentMatch.round),
		matchId: currentMatch.id
	}));

	// Redirigir a pong.html con parámetro de torneo
	window.location.href = 'pong.html?tournament=true';
}

// Actualizar siguiente ronda
function updateNextRound(completedMatch) {
	const nextRound = completedMatch.round + 1;
	const nextRoundMatches = tournament.matches.filter(m => m.round === nextRound);

	if (nextRoundMatches.length === 0) return;

	const nextMatchIndex = Math.floor(completedMatch.position / 2);
	const nextMatch = nextRoundMatches[nextMatchIndex];

	if (!nextMatch) return;

	const isFirstPosition = completedMatch.position % 2 === 0;
	
	if (isFirstPosition) {
		nextMatch.player1 = completedMatch.winner;
	} else {
		nextMatch.player2 = completedMatch.winner;
	}

	console.log("➡️ Siguiente ronda actualizada:", nextMatch);
}

// Mostrar bracket
function showBracket() {
	// Esconder otras pantallas
	matchAnnouncement.style.display = 'none';
	winnerScreen.style.display = 'none';
	tournamentSetup.style.display = 'none';

	// Mostrar bracket
	tournamentBracket.style.display = 'block';
	
	// Re-renderizar con nuevos resultados
	renderBracket();
}

// Mostrar ganador del torneo
function showTournamentWinner() {
	// Esconder otras pantallas
	tournamentBracket.style.display = 'none';
	matchAnnouncement.style.display = 'none';
	
	// Mostrar pantalla de ganador
	winnerScreen.style.display = 'flex';
	
	document.getElementById('winnerName').textContent = tournament.winner.alias;
}

// Resetear torneo
function resetTournament() {
	tournament = null;
	addedPlayers = [];
	
	// Limpiar sessionStorage
	sessionStorage.removeItem('tournamentData');
	sessionStorage.removeItem('tournamentMatch');
	
	// Reset forms
	document.getElementById('userAlias').value = '';
	document.getElementById('playerAlias').value = '';
	updatePlayersList();
	updateStartButton();
	
	// Mostrar setup screen
	winnerScreen.style.display = 'none';
	tournamentBracket.style.display = 'none';
	matchAnnouncement.style.display = 'none';
	tournamentSetup.style.display = 'flex';

	console.log("🔄 Torneo reseteado");
}

// Verificar si estamos en modo torneo
function isTournamentMode() {
	return tournament !== null;
}

// Función para obtener información del match para el UI del pong
function getCurrentMatchInfo() {
	const matchData = sessionStorage.getItem('tournamentMatch');
	if (!matchData) return null;
	
	return JSON.parse(matchData);
}

// Exponer funciones globalmente para uso en other files
window.getCurrentTournamentMatchInfo = getCurrentMatchInfo;
window.isTournamentActive = () => {
	const urlParams = new URLSearchParams(window.location.search);
	return urlParams.get('tournament') === 'true';
};

// Inicializar cuando la página cargue
document.addEventListener('DOMContentLoaded', function() {
	initTournament();
});