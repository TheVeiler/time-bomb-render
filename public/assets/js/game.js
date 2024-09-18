const $friends = document.querySelector("#friends");
const $me = document.querySelector("#me");
const $myself = document.querySelector("#myself");
const $my_cards = document.querySelector("#my_cards");
const $form = document.querySelector("#form");


$form.addEventListener("submit", (ev) => {
	ev.preventDefault();

	window.top.postMessage(JSON.stringify({
		"subject": "tentative_connexion"
	}), '*');
});


window.onmessage = (ev) => {
	console.log("received from parent window: %s", ev.data);

	const message = JSON.parse(ev.data);
	postMsgManager[message.subject](message);
};

const postMsgManager = {
	// index → PLAYERS_INFO → game
	"players_info": (msg) => {
		$me.classList.add(msg.my_role);

		Object.values(msg.players).forEach((user) => {
			let usercard = document.createElement("div");
			usercard.id = user.name;
			usercard.classList.add("usercard");

			if (user.name === msg.pliers)
				usercard.classList.add("pliers");
			else
				usercard.classList.remove("pliers");

			let usercard_pseudo = document.createElement("h3");
			usercard_pseudo.classList.add("pseudo");
			usercard_pseudo.innerText = user.name;

			let usercard_elo = document.createElement("span");
			usercard_elo.innerText = "Elo : ";

			let usercard_eloscore = document.createElement("span");
			usercard_eloscore.classList.add("elo");
			usercard_eloscore.innerText = user.elo;

			usercard_elo.appendChild(usercard_eloscore);

			usercard.appendChild(usercard_pseudo);
			usercard.appendChild(document.createElement("hr"));
			usercard.appendChild(usercard_elo);


			if (user.name === msg.myself) {
				$myself.appendChild(usercard);
			} else {
				$friends.appendChild(usercard);
			}
		});

		console.log(msg);

		document.querySelector("#nb_wires_max").innerText = Object.keys(msg.players).length;
	},

	// index → RECEIVE_CARDS → game
	"receive_cards": (msg) => {
		$my_cards.replaceChildren();

		msg.cards.forEach((card) => {
			let img = document.createElement("div");
			img.classList.add("card");
			img.classList.add("hidden");
			img.classList.add(card.type);

			$my_cards.appendChild(img);
		});

		document.querySelectorAll(".usercard").forEach(usercard => {
			if (msg.turn > 1) {
				usercard.querySelector(".hand").remove();
			}

			let cards = document.createElement("div");
			cards.classList.add("hand");

			for (let i = 0; i < (6 - msg.turn); i++) {
				let card = document.createElement("div");
				card.id = usercard.id + ":card" + i;
				card.classList.add("card");
				card.classList.add("hidden");

				card.addEventListener("click", ev => {
					console.log(card.id);
					window.top.postMessage(JSON.stringify({
						"subject": "choose_card",
						"owner": usercard.id,
						"cardId": card.id,
						"hidden": card.classList.contains("hidden")
					}), '*');
				});

				cards.appendChild(card);
			}

			usercard.appendChild(cards);
		});
	},

	// index → REVEAL_CARD → game
	"reveal_card": (msg) => {
		document.querySelectorAll(".usercard").forEach((user) => {
			if (user.id === msg.pliers)
				user.classList.add("pliers");
			else
				user.classList.remove("pliers");
		});

		document.querySelector("#nb_wires").innerText = msg.nb_opened_wires;

		document.getElementById(msg.cardId).classList.remove("hidden");
		document.getElementById(msg.cardId).classList.add(msg.cardType);
	},

	// index → GAME_END → game
	"game_end": (msg) => {
		document.querySelector("#winners").classList.add(msg.winners);
		document.querySelector("#winners").classList.add("visible");

		document.querySelector("#winners_members").innerText = msg.team;
	}
};