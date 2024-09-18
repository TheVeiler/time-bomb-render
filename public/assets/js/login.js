const $form = document.querySelector("#form");
const $username = document.querySelector("#username");


$form.addEventListener("submit", (ev) => {
	ev.preventDefault();

	window.top.postMessage(JSON.stringify({
		"subject": "tentative_connexion",
		"author": $username.value.toLowerCase()
	}), '*');
});


window.onmessage = (ev) => {
	console.log("received from parent window: %s", ev.data);

	const msg = JSON.parse(ev.data);

	postMsgManager[msg.subject](msg);
};