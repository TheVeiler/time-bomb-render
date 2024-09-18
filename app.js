// IMPORT MODULES
const express = require('express')
const serveIndex = require('serve-index')
const http = require('http')
const { Server } = require('socket.io')
// const nodeJsonDb = require("node-json-db");
const { JsonDB } = require('node-json-db')
const { Config } = require('node-json-db/dist/lib/JsonDBConfig')

// IMPORT CONFIG
const config = require('./config.json')

// SETUP HTML SERVER
const app = express()
app.use('/public', express.static('public'))
app.use('/public', serveIndex('public'))
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/pages/index.html')
})

// SETUP SOCKET.IO SERVER
const server = http.createServer(app)
const io = new Server(server)
io.on('connection', (socket) => {
    printLog('user_connected', { id: socket.id, ip: socket.handshake.address })

    socket.on('disconnect', (reason) => {
        printLog('user_disconnected', {
            id: socket.id,
            ip: socket.handshake.address,
            username: socket.username,
            reason: reason,
        })

        /*delete DATA.rooms.lobby.connected_users[socket.username]

        io.sockets.emit('user_disconnected', {
            subject: 'user_disconnected',
            userdata: {
                name: socket.username,
            },
        })

        if (DATA.rooms.lobby.game_started) {
            DATA.rooms.lobby.game_started = false

            io.sockets.emit('error', {
                subject: 'error',
                code: 3,
            })
        }*/
    })

    socket.on('tentative_connexion', (msg) => {
        console.log(msg)
        if (
            Object.keys(DATA.rooms.lobby.connected_users).some(
                (user) => user === msg.author,
            )
        ) {
            socket.emit('error', {
                subject: 'error',
                code: 1,
            })
        } else if (DATA.rooms.lobby.game_started) {
            socket.emit('error', {
                subject: 'error',
                code: 2,
            })
        } else if (!Object.keys(DATA.users).includes(msg.author)) {
            socket.emit('error', {
                subject: 'error',
                code: 4,
            })
        } else {
            socket.username = msg.author
            socket.join('lobby')

            socket.emit('connection_accepted', {
                subject: 'connection_accepted',
                name: socket.username,
            })

            printLog('user_logged', {
                id: socket.id,
                ip: socket.handshake.address,
                username: socket.username,
            })

            DATA.rooms.lobby.connected_users[socket.username] =
                DATA.users[socket.username]
            DATA.rooms.lobby.connected_users[socket.username].ready = false

            if (countdown_fct !== null) {
                resetCoundown()

                socket.broadcast.to('lobby').emit('countdown_stop', {
                    subject: 'countdown_stop',
                })
            }

            socket.broadcast.to('lobby').emit('user_connected', {
                subject: 'user_connected',
                userdata: DATA.users[socket.username],
            })
        }
    })

    socket.on('loading_lobby', async (msg) => {
        socket.emit('connected_users', {
            subject: 'connected_users',
            connected_users: DATA.rooms.lobby.connected_users,
        })
    })

    socket.on('toggle_ready', async (msg) => {
        const readyStatus =
            DATA.rooms.lobby.connected_users[socket.username].ready

        DATA.rooms.lobby.connected_users[socket.username].ready = !readyStatus

        io.in('lobby').emit('user_ready', {
            subject: 'user_ready',
            user: socket.username,
            ready: !readyStatus,
        })

        var minimum_players = 2 // DEVELOPPEMENT HACK
        // var minimum_players = 4;
        var maximum_players = 8
        var users = Object.values(DATA.rooms.lobby.connected_users)

        if (
            users.every((user) => user.ready) &&
            users.length >= minimum_players &&
            users.length <= maximum_players
        ) {
            countdown_fct = setInterval(async () => {
                countdown--

                if (countdown > 0) {
                    io.in('lobby').emit('countdown', {
                        subject: 'countdown',
                        step: countdown,
                    })
                } else {
                    resetCoundown()

                    io.in('lobby').emit('game_start', {
                        subject: 'game_start',
                    })

                    await setupGame()

                    DATA.rooms.lobby.game_started = true
                    DATA.rooms.lobby.connected_users = {}

                    await newTurn()
                }
            }, 1000)
        } else {
            resetCoundown()

            io.in('lobby').emit('countdown_stop', {
                subject: 'countdown_stop',
            })
        }
    })

    socket.on('choose_card', async (msg) => {
        if (!gameLocked && msg.author == DATA.rooms.game.pliers) {
            var openedCards = DATA.rooms.game.players[msg.owner].cards.filter(
                (card) => card.opened,
            )
            var closedCards = DATA.rooms.game.players[msg.owner].cards.filter(
                (card) => !card.opened,
            )

            var chosenCard =
                closedCards[Math.floor(Math.random() * closedCards.length)]
            chosenCard.opened = true

            DATA.rooms.game.players[msg.owner].cards =
                closedCards.concat(openedCards)

            DATA.rooms.game.pliers = msg.owner

            DATA.rooms.game.nb_opened_cards++

            if (chosenCard.type === 'wire') DATA.rooms.game.nb_opened_wires++

            io.in('game').emit('reveal_card', {
                subject: 'reveal_card',
                pliers: DATA.rooms.game.pliers,
                cardId: msg.cardId,
                cardType: chosenCard.type,
                nb_opened_wires: DATA.rooms.game.nb_opened_wires,
            })

            if (
                DATA.rooms.game.nb_opened_wires ===
                Object.keys(DATA.rooms.game.players).length
            ) {
                endGame('good')
            } else if (chosenCard.type === 'bomb') {
                endGame('bad')
            } else if (
                DATA.rooms.game.nb_opened_cards >=
                Object.keys(DATA.rooms.game.players).length
            ) {
                if (DATA.rooms.game.turn === 4) endGame('bad')
                else {
                    gameLocked = true

                    setTimeout((_) => {
                        newTurn()

                        gameLocked = false
                    }, 1500)
                }
            }
        }
    })
})

// VALUES
var countdown_fct = null // countdown function when started
var countdown = 4 // countdown value
var deck = [] // deck of cards
var gameLocked = false // whether players have to wait or not

// FUNCTIONS
function resetCoundown() {
    clearInterval(countdown_fct)
    countdown_fct = null
    countdown = 4
}

async function setupGame() {
    const pliers = Object.keys(DATA.rooms.lobby.connected_users)[
        Math.floor(
            Math.random() *
                Object.keys(DATA.rooms.lobby.connected_users).length,
        )
    ]

    var rolesDeck = []
    switch (true) {
        case Object.keys(DATA.rooms.lobby.connected_users).length === 8:
        case Object.keys(DATA.rooms.lobby.connected_users).length === 7:
            rolesDeck.push('allies')
            rolesDeck.push('foes')
        case Object.keys(DATA.rooms.lobby.connected_users).length === 6:
            rolesDeck.push('allies')
        case Object.keys(DATA.rooms.lobby.connected_users).length === 5:
        case Object.keys(DATA.rooms.lobby.connected_users).length === 4:
            rolesDeck.push('allies')
            rolesDeck.push('allies')
            rolesDeck.push('allies')
            rolesDeck.push('foes')
            rolesDeck.push('foes')
            break
        // DEVELOPPEMENT HACK
        case Object.keys(DATA.rooms.lobby.connected_users).length === 2:
            rolesDeck.push('allies')
            rolesDeck.push('foes')
            break
        default:
            rolesDeck = ['allies', 'allies', 'allies', 'foes', 'foes', 'foes']
        //
    }

    var players = {}

    Object.keys(DATA.rooms.lobby.connected_users).forEach(async (player) => {
        const role = rolesDeck.splice(
            Math.floor(Math.random() * rolesDeck.length),
            1,
        )[0]

        players[player] = {
            name: player,
            team: role,
            elo: DATA.users[player].elo,
            played: DATA.users[player].played,
            wins: DATA.users[player].wins,

            cards: [],
            declaration: {},
        }
    })

    DATA.rooms.game = {
        players: players,
        turn: 0,
        pliers: pliers,
        nb_opened_wires: 0,
        nb_players: Object.keys(DATA.rooms.lobby.connected_users).length,
    }

    var sockets = await io.in('lobby').fetchSockets()
    //io.adapter.rooms['lobby']
    //io.sockets.clients('lobby')
    sockets.forEach(async (socket) => {
        socket.leave('lobby')
        socket.join('game')

        socket.emit('players_info', {
            subject: 'players_info',
            players: DATA.rooms.lobby.connected_users,
            pliers: pliers,
            my_role: players[socket.username].team,
        })
    })
}

async function newTurn() {
    //endGame("bad");

    var nbPlayers = Object.keys(DATA.rooms.game.players).length

    var deck = []

    DATA.rooms.game.turn++
    DATA.rooms.game.nb_opened_cards = 0

    if (DATA.rooms.game.turn == 1) {
        deck.push('bomb')

        for (let i = 0; i < nbPlayers; i++) {
            deck.push('wire')
        }

        for (let i = 0; i < 4 * nbPlayers - 1; i++) {
            deck.push('nothing')
        }
    } else {
        for (player in DATA.rooms.game.players) {
            DATA.rooms.game.players[player].cards
                .filter((card) => !card.opened)
                .forEach((card) => deck.push(card.type))
        }
    }

    for (player in DATA.rooms.game.players) {
        var hand = []

        for (let i = 0; i < 6 - DATA.rooms.game.turn; i++) {
            hand.push({
                type: deck.splice(
                    Math.floor(Math.random() * deck.length),
                    1,
                )[0],
                opened: false,
                owner: player,
            })
        }

        DATA.rooms.game.players[player].cards = hand
    }

    var sockets = await io.in('game').fetchSockets()
    // io.sockets.clients('game')
    sockets.forEach(async (socket) => {
        socket.emit('receive_cards', {
            subject: 'receive_cards',
            turn: DATA.rooms.game.turn,
            cards: DATA.rooms.game.players[socket.username].cards,
        })
    })
}

async function endGame(winners) {
    gameLocked = true

    const wTeam = Object.values(DATA.rooms.game.players).filter(
        (player) => player.team === (winners === 'good' ? 'allies' : 'foes'),
    )
    const lTeam = Object.values(DATA.rooms.game.players).filter(
        (player) => player.team !== (winners === 'good' ? 'allies' : 'foes'),
    )

    const avgEloWinners = Math.floor(
        wTeam.map((player) => player.elo).reduce((acc, curr) => acc + curr) /
            wTeam.length,
    )
    const avgEloLoosers = Math.floor(
        lTeam.map((player) => player.elo).reduce((acc, curr) => acc + curr) /
            lTeam.length,
    )

    const delta = avgEloWinners - avgEloLoosers
    const pWinners = 1 / (1 + 10 ** (-delta / 400))
    const points = Math.floor(config.elo.k_factor * (1 - pWinners))

    wTeam.forEach((player) => {
        player.elo += points
        player.played.total++
        player.played[player.team]++
        player.wins.total++
        player.wins[player.team]++
    })
    lTeam.forEach((player) => {
        player.elo -= points
        player.played.total++
        player.played[player.team]++
    })

    Object.values(DATA.rooms.game.players).map((player) => {
        delete player.cards
        delete player.declaration
        delete player.ready
        delete player.team

        return player
    })

    Object.values(DATA.rooms.game.players).forEach(async (player) => {
        DATA.users[player.name] = player
    })

    var team = wTeam.map((player) => player.name)

    var sockets = await io.in('game').fetchSockets()
    //io.sockets.clients('game')
    sockets.forEach((socket) => {
        socket.leave('game')
        socket.join('lobby')
    })

    setTimeout(async (_) => {
        io.to('lobby').emit('game_end', {
            subject: 'game_end',
            winners: winners,
            team: team,
        })

        gameLocked = false
    }, 1500)

    DATA.rooms.lobby.game_started = false

    await DB.push('/', DATA)
}

// INIT DATABASE
// const DB = new nodeJsonDb.JsonDB(new nodeJsonDb.Config("database.json", true, true, "/"));
const DB = new JsonDB(new Config('database.json', true, true, '/'))
const DATA = {}
Promise.resolve(DB.getData('/')).then((response) => {
    Object.assign(DATA, response)
    DATA.server = 'on'

    // CLEAN DATABASE UPON STARTUP
    DATA.rooms.lobby.connected_users = {}
    DATA.rooms.lobby.game_started = false
    DATA.rooms.game = {}

    printLog('db_loaded')
})

// SERVER SHUTDOWN HANDLER
process.on('SIGINT', async () => {
    DATA.server = 'off'

    await DB.push('/', DATA)

    io.sockets.emit('error', {
        subject: 'error',
        code: 0,
    })

    process.exit()
})

function printLog(type, data) {
    switch (type) {
        case 'server_online':
            console.log('----------------')
            console.log('SERVER ONLINE')
            console.log(`  ip: http://${config.external_host}/`) // default http port = 80
            console.log('  internal port: %s', config.internal_port)
            break

        case 'db_loaded':
            console.log('DATABASE LOADED')
            break

        case 'user_connected':
            console.log('USER CONNECTED')
            console.log('  id: %s', data.id)
            console.log('  ip: %s', data.ip)
            break

        case 'user_logged':
            console.log('USER LOGGED')
            console.log('  id: %s', data.id)
            console.log('  ip: %s', data.ip)
            console.log('  username: %s', data.username)
            break

        case 'user_disconnected':
            console.log('USER DISCONNECTED')
            if (data.username) {
                console.log('  username: %s', data.username)
            } else {
                console.log('  id: %s', data.id)
                console.log('  ip: %s', data.ip)
            }
            if (data.reason) console.log('  reason: %s', data.reason)
            break
    }

    console.log('----------------')
}

// ----------------------------------------------
// OPEN SERVER
server.listen(config.internal_port, () => {
    printLog('server_online')
})
