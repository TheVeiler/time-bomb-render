const CONFIG = {
    server: {
        ip: "176.137.121.204",
        port: 1010
    }
};
    
const ERRORS = [
    {
        "code": 0,
        "cause": "Le serveur a été fermé"
    },
    {
        "code": 1,
        "cause": "Un utilisateur avec ce nom est déjà connecté"
    },
    {
        "code": 2,
        "cause": "Une partie est déjà en cours"
    },
    {
        "code": 3,
        "cause": "Un joueur vient de quitter la partie"
    },
    {
        "code": 4,
        "cause": "Votre identifiant est inconnu"
    }
];

const errorManager = (code) => {
    alert(
        "Erreur de connexion" + "\n" +
        "Code : " + code + "\n" +
        "Cause : " + ERRORS[code].cause
    );
}