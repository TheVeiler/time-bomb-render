const $friends = document.querySelector("#friends");
const $myself = document.querySelector("#myself");
const $form = document.querySelector("#form");
const $submitButton = document.querySelector("#submitButton");
const $countdown = document.querySelector("#countdown");


window.top.postMessage(JSON.stringify({
	"subject": "loading_lobby"
}), '*');

$form.addEventListener("submit", (ev) => {
	ev.preventDefault();

	if ($submitButton.value === "Commencer la mission") {
		$submitButton.value = "Interrompre la mission";
	} else {
		$submitButton.value = "Commencer la mission";
	}

	window.top.postMessage(JSON.stringify({
		"subject": "toggle_ready"
	}), '*');
});


window.onmessage = (ev) => {
	console.log("received from parent window: %s", ev.data);

	const message = JSON.parse(ev.data);
	postMsgManager[message.subject](message);
};

const postMsgManager = {
	// index → CONNECTED_USERS → lobby
	"connected_users": (msg) => {
		Object.values(msg.connected_users).forEach((user) => {
			let usercard = document.createElement("div");
			usercard.id = user.name;
			usercard.classList.add("usercard");
			if (user.ready) {
				usercard.classList.add("ready");
			} else {
				usercard.classList.remove("ready");
			}

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
	},

	// index → USER_CONNECTED → lobby
	"user_connected": (msg) => {
		const user = msg.userdata;

		let usercard = document.createElement("div");
		usercard.id = user.name;
		usercard.classList.add("usercard");

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

		$friends.appendChild(usercard);
	},

	// index → USER_READY → lobby
	"user_ready": (msg) => {
		const user = msg.user;
		const ready = msg.ready;

		if (ready) {
			document.querySelector("#" + user).classList.add("ready");
		} else {
			document.querySelector("#" + user).classList.remove("ready");
		}
	},

	// index → USER_DISCONNECTED → lobby
	"user_disconnected": (msg) => {
		const user = msg.userdata.name;

		document.querySelector("#" + user).remove();
	},

	// index → COUNTDOWN → lobby
	"countdown": (msg) => {
		const step = msg.step;

		document.querySelector("#timeLeft").innerText = step;
		$countdown.classList.add("started");
	},

	// index → COUNTDOWN_STOP → lobby
	"countdown_stop": (msg) => {
		$countdown.querySelectorAll("span")[0].innerText = "";
		$countdown.classList.remove("started");
	}
};