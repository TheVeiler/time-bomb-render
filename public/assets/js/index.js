const $content = document.querySelector("#content");
const $frame = document.querySelector("#frame");
const socket = io();

let currentPage = "login";

let username;

let frameLoading = false;
let pendingMessages = [];


$frame.onload = () => {
	document.title = username; //! DEBUG
	// document.title = $frame.contentDocument.title;

	frameLoading = false;

	while (pendingMessages.length > 0) {
		readMessageFromServer(...pendingMessages.splice(0, 1)[0]);
	}
};


const eventsHandler = (ev, msg) => {
	if (!frameLoading) {
		readMessageFromServer(ev, msg);
	} else {
		pendingMessages.push([ev, msg]);
	}
}


// MANAGE MESSAGES COMING FROM SERVER
const eventTypes = [
	"connected_users",
	"connection_accepted",
	"countdown",
	"countdown_stop",
	"error",
	"game_end",
	"game_start",
	"players_info",
	"receive_cards",
	"reveal_card",
	"user_connected",
	"user_disconnected",
	"user_ready",
];

eventTypes.forEach(eventType => {
	socket.on(eventType, (msg) => {
		eventsHandler(eventType, msg);
	});
});


window.onmessage = (ev) => {
	let msg = JSON.parse(ev.data);

	postMsgManager[msg.subject](msg, socket);
};


// FUNCTIONS
function readMessageFromServer(subject, msg) {
	switch (subject) {
		case "connection_accepted":
			username = msg.name;
			switchToPage("lobby");
			break;

		case "error":
			const code = msg.code;

			switch (code) {
				case 0:
					// serveur fermé de manière abrupte, personne ne change de page
					break;
				case 1:
					// un utilisateur avec ce nom est déjà connecté, pas besoin de changer de page (sauf si écran des résultats ?)
					break;
				case 2:
					// une partie est déjà en cours, on ne change pas de page
					break;
				case 3:
					batonPassToServer({
						"subject": "tentative_connexion",
						"author": username
					});
					//switchToPage("lobby");
					break;
				case 4:
					// l'identifiant est inconnu, on ne change pas de page
					break;
			}

			errorManager(code);
			break;

		case "game_start":
			switchToPage("game");
			break;

		case "user_ready":
			batonPassToFrame(msg);
			break;

		case "connected_users":
			msg.myself = username;

			batonPassToFrame(msg);
			break;

		case "user_connected":
			if (msg.userdata.name != username) {
				batonPassToFrame(msg);
			}
			break;

		case "user_disconnected":
			batonPassToFrame(msg);
			break;

		case "countdown":
			batonPassToFrame(msg);
			break;

		case "countdown_stop":
			batonPassToFrame(msg);
			break;

		case "players_info":
			msg.myself = username;

			batonPassToFrame(msg);
			break;

		case "receive_cards":
			batonPassToFrame(msg);
			break;

		case "reveal_card":
			batonPassToFrame(msg);
			break;

		case "game_end":
			batonPassToFrame(msg);
			break;
	}
}

function batonPassToFrame(msg) {
	frame.contentWindow.postMessage(JSON.stringify(msg), "*");
}

function batonPassToServer(msg) {
	msg.author = msg.author ?? username;

	socket.emit(msg.subject, msg);
}

function switchToPage(newPage) {
	frameLoading = true;
	$frame.src = "public/pages/" + newPage + ".html";
	currentPage = newPage;
}



// IFRAME MESSAGE MANAGER
const postMsgManager = {
	// index ← tentative_connexion ← login
	"tentative_connexion": (msg) => {
		// username = username || msg.author;
		console.log(msg);
		batonPassToServer(msg);
	},


	// index ← LOADING_LOBBY ← lobby
	"loading_lobby": (msg) => {
		batonPassToServer(msg);
	},


	// index ← TOGGLE_READY ← lobby
	"toggle_ready": (msg) => {
		batonPassToServer(msg);
	},


	// index ← CHOOSE_CARD ← game
	"choose_card": (msg) => {
		if (msg.owner != username && msg.hidden) {
			batonPassToServer(msg);
		}
	}


};