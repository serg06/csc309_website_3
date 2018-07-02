require('./static-content-react/lib/constants.js'); // ports n stuff
const game = require('./game_node.js'); // ports n stuff
const sqlite3 = require('sqlite3').verbose();

// auth
const jwt = require('jsonwebtoken');
const jwtsecret = '4j9gja9j03h2g08h31y0yg80wg80';

// will create the db if it does not exist
const db = new sqlite3.Database('db/database.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the database.');
});

// ws stuff
let WebSocketServer = require('ws').Server;
let wss = new WebSocketServer({port: wwWsPort});

/* detect and close broken connections */
function noop() {
}

function heartbeat() {
    this.isAlive = true;
}

wss.on('connection', function connection(ws) {
    ws.isAlive = true;
    ws.on('pong', heartbeat);
});

const interval = setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
        if (ws.isAlive === false) {
            if (ws.player) {
                ws.player.leaveWorld();
            }
            ws.terminate();
            return;
        }

        ws.isAlive = false;
        ws.ping(noop);
    });
}, 30000);

/* game worlds */
const numWorlds = 3;
let worlds = [];

// player limit
const playerLimit = 10;

// when everyone in the stage won the game
let onWin = (stage) => {
    // notify everyone of their win
    for (player of stage.players) {
        player.ws.send(JSON.stringify({
            msg: 'update',
            status: 'won'
        }));
    }

    // give everyone points
    for (player of stage.players) {
        addScore(player.ws.id, 10);
    }

    // reset world
    game.Stage.apply(stage, [stage.height, stage.width, stage.onWin, stage.onLose, stage.onUpdate]);
    stage.initialize();
    stage.run();
};

// when a player lost a game
let onLose = (player) => {
    // notify person of their loss
    player.ws.send(JSON.stringify({
        msg: 'update',
        status: 'lost'
    }), noop);

    // kick them out
    player.leaveWorld();
};

// start worlds
for (let i = 0; i < numWorlds; i++) {
    let onUpdate = (updates) => {
        wss.worldBroadcast(i, {msg: 'update', status: 'playing', updates: updates});
    };
    let stage = new game.Stage(20, 20, onWin, onLose, onUpdate);
    stage.initialize();
    stage.run();
    worlds.push(stage);
}

wss.on('close', function (ws) {
    console.log('disconnected');
    if (ws.player) {
        ws.player.leaveWorld();
    }
    ws.terminate();
});

// broadcast to all clients in a world
wss.worldBroadcast = function (worldIndex, message) {
    message = JSON.stringify(message);
    console.log(`broadcast to world ${worldIndex}: ${message}`);
    let world = worlds[worldIndex];

    // handle gone players in yet another place
    let playersToRemove = [];

    for (let player of world.players.slice()) {
        player.ws.send(message, function ack(error) {
            if (error) {
                console.log(`failed to send to someone in world ${worldIndex}; error: ${error}`);
                player.leaveWorld();
                player.ws.terminate();
            }
        });
    }
};

// when they connect
wss.on('connection', function (ws) {
    // send them list of worlds
    let msg = {msg: 'worlds', worlds: []};
    for (let i = 0; i < numWorlds; i++) {
        msg.worlds.push({player_count: worlds[i].numPlayers(), player_limit: playerLimit});
    }
    ws.send(JSON.stringify(msg), function ack(error) {
        console.log(`failed to send list of worlds: ${error}`);
    });

    // handlers
    ws.on('message', function (message) {
        // parse message
        console.log(`receive message: ${message}`);
        message = JSON.parse(message);
        let msg = message.msg;
        if (msg === undefined) {
            console.log('error: no msg attribute');
            return;
        }

        // handle auth first
        if (message.msg === 'authenticate') {
            let token = message.token;
            if (token === undefined) return;

            // verify jwt
            jwt.verify(token, jwtsecret, function (err, decoded) {
                if (err) {
                    console.log('auth error');
                    ws.send(JSON.stringify({msg: 'authentication_error'}), noop);
                    return;
                }

                console.log('auth success!');

                // store decoded payload in ws object
                ws.id = decoded.user.id;
                ws.authenticated = true;

                // send back success
                ws.send(JSON.stringify({msg: 'authenticated'}), noop);
            })
        }

        // if they're still not authenticated
        if (!ws.authenticated) {
            console.log('unauthenticated message received');
            ws.send(JSON.stringify({msg: 'unauthenticated'}), noop);
            return;
        }

        // remaining handlers; they must be authenticated at this point
        switch (msg) {
            case 'choose_world':
                // get world
                let world = parseInt(message.world);
                if (world < 0 || world > (numWorlds-1)) {
                    console.log(`attempt to join invalid world: ${world}`);
                    ws.send(JSON.stringify({msg: 'error', error: 'invalid world'}), noop);
                    return;
                }

                // player limit
                if (worlds[world].numPlayers() >= playerLimit) {
                    ws.send(JSON.stringify({msg: 'error', error: `world ${world} is full`}));
                    return;
                }

                // put them into world
                let player = worlds[world].addPlayer(ws);
                ws.world = world;
                ws.player = player;

                ws.send(JSON.stringify({
                    msg: 'board',
                    board: worlds[world].genBoard()
                }), noop);
                break;
            case 'leave_world':
                // player leaves world
                if (ws.player) {
                    ws.player.leaveWorld();
                }
                break;
            case 'move':
                // player moves
                let direction = message.direction;
                if (ws.player) {
                    ws.player.move(direction);
                }
                break;
            case 'authenticate':
                // handled above
                break;
            default:
                console.log(`error: invalid msg: ${msg}`);
                break;
        }
    });
});

// add score to player
// NOTE: WILL FAIL IF YOU DIDN'T RUN SETUP.SH!
function addScore(id, score) {
    let sql = '' +
        'UPDATE appuser ' +
        'SET score = score + ? ' +
        'WHERE id = ?';

    db.run(sql, [score, id], function (err) {
        if (err) {
            console.log(`err updating score for ${id}: ${err.message}`);
        } else {
            console.log(`updated score for user ${id}`);
        }
    });
}
