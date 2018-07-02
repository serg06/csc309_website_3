module.exports = {
    'Stage': Stage,
    'Player': Player
};

/*******************************************
 *************** BEGIN STAGE ***************
 *******************************************/


// game status
const STOPPED = 0;
const RUNNING = 1;

function Stage(width, height, onWin, onLose, onUpdate) {
    // NOTE: Not designed for tiny width/height!

    this.actors = []; // all actors on this stage (monsters, players, boxes, ...)
    this.deadActors = []; // dead actors to remove from this.actors when possible
    this.players = []; // special actors, ws players

    // the logical width and height of the stage
    this.width = width;
    this.height = height;

    // what to do when we win/lose or update board
    this.onWin = onWin;
    this.onLose = onLose;
    this.onUpdate = onUpdate;

    // by default, 1 step per second
    this.speed = 1;

    // handle own interval
    this.interval = null;

    // store free spots
    this.freeSpots = [];

    this.state = STOPPED;
}

// initialize an instance of the game
Stage.prototype.initialize = function () {
    // populate free spots
    for (let x = 0; x < this.width; x++) {
        for (let y = 0; y < this.height; y++) {
            this.freeSpots.push([x, y]);
        }
    }

    // Add walls around the outside of the stage, so actors can't leave the stage
    for (let y = 0; y < this.height; y++) {
        this.addActor(new Wall(this, 0, y));
        this.addActor(new Wall(this, this.width - 1, y));
    }

    for (let x = 1; x < this.width - 1; x++) {
        this.addActor(new Wall(this, x, 0));
        this.addActor(new Wall(this, x, this.height - 1));
    }

    // Add some Boxes to the stage
    for (let num = this.height * this.width / 3.5; num >= 1; num--) {
        let coords = this.freeSpots[rand(0, this.freeSpots.length - 1)];
        this.addActor(new Box(this, ...coords));
    }

    // Add in some monsters
    for (let num = this.height * this.width / 96; num >= 1; num--) {
        let coords = this.freeSpots[rand(0, this.freeSpots.length - 1)];
        this.addActor(new Monster(this, ...coords));
    }

    // Add in some special monsters!
    for (let num = this.height * this.width / 256; num >= 1; num--) {
        let coords = this.freeSpots[rand(0, this.freeSpots.length - 1)];
        this.addActor(new BlueMonster(this, ...coords));
    }
};

// Add actor to stage
Stage.prototype.addActor = function (actor) {
    let idx = this.freeSpots.findIndex(coords => vertSub(coords, actor.getCoords()).every(coord => coord === 0));
    if (idx === -1) {
        console.log("can't add actor to spot, already taken.");
        return;
    }
    this.freeSpots.splice(idx, 1);
    this.actors.push(actor);

    if (actor instanceof Player) {
        this.players.push(actor);
    }
};

// Remove actor from stage
Stage.prototype.removeActor = function (actor) {
    // remove from list of actors
    let index = this.actors.indexOf(actor);
    if (index === -1) {
        console.log('Error: Actor not in list.');
    } else {
        this.actors.splice(index, 1);
    }

    if (!(actor instanceof Player)) {
        return;
    }

    // remove from list of players
    index = this.players.indexOf(actor);
    if (index === -1) {
        console.log('Error: Player not in list.');
    } else {
        console.log('remove a player from stage');
        this.players.splice(index, 1);
    }
};

// Take one step in the animation of the game, then broadcast world updates
Stage.prototype.step = function () {
    // don't run if no1's playing
    if (this.numPlayers() === 0) return;

    let oldBoard = this.genBoard();

    // Each actor steps
    this.actors.forEach(actor => {
        actor.step();
    });

    // Remove dead actors
    this.deadActors.forEach(actor => {
        this.removeActor(actor);
    });
    this.deadActors = [];

    // Check if won (all monsters are dead)
    if (this.checkIfWon()) {
        this.winGame();
    }

    this.onUpdate(this.getBoardDelta(oldBoard, this.genBoard()));
};

// return the first actor at coordinates (x,y), or undefined
Stage.prototype.getActor = function (x, y) {
    for (let i = 0; i < this.actors.length; i++) {
        let a = this.actors[i];
        if (a.x === x && a.y === y) {
            return a;
        }
    }
};

// Check if coordinate position is on the stage
Stage.prototype.validCoords = function (x, y) {
    return x === parseInt(x) && 0 <= x && x < this.width && y === parseInt(y) && 0 <= y && y < this.height;
};

// Called when game is won.
Stage.prototype.winGame = function () {
    this.stop();

    if (this.onWin) {
        this.onWin(this);
    }
};

// Run the game given a speed
Stage.prototype.run = function (speed) {
    this.stop();
    this.speed = speed || this.speed; // number of times to step per second
    this.interval = setInterval(() => {
        this.step()
    }, 1000 / this.speed);

    this.state = RUNNING;
};

// Stop (or "pause") the game.
Stage.prototype.stop = function () {
    clearInterval(this.interval);
    this.state = STOPPED;
};

// Check if we won the game (i.e. no Monsters on board)
Stage.prototype.checkIfWon = function () {
    let count = 0;
    this.actors.forEach(actor => {
        count += actor instanceof Monster;
    });
    return count === 0;
};

// Number of player actors
Stage.prototype.numPlayers = function () {
    return this.players ? this.players.length : 0;
};

// Create 2D array representation of board to send across websocket
Stage.prototype.genBoard = function () {
    let board = [];

    // Set all spots to blank
    for (let y = 0; y < this.height; y++) {
        board.push([]);
        for (let x = 0; x < this.width; x++) {
            board[y].push('blank');
        }
    }

    // Set spots to actors
    this.actors.forEach(a => {
        let coords = a.getCoords();
        board[coords[1]][coords[0]] = a.getName();
    });

    return board;
};

// Add a ws player
Stage.prototype.addPlayer = function (ws) {
    let coords = this.freeSpots[rand(0, this.freeSpots.length - 1)];
    console.log(`select coords: ${coords}`);
    let player = new Player(this, ...coords, ws);
    this.addActor(player);
    return player;
};

// Get board delta between two boards
Stage.prototype.getBoardDelta = function (oldBoard, newBoard) {
    let boardDelta = [];

    for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
            if (oldBoard[y][x] !== newBoard[y][x]) {
                boardDelta.push([[y, x], newBoard[y][x]]);
            }
        }
    }

    return boardDelta;
};


/*****************************************
 *************** END STAGE ***************
 *****************************************/


/*******************************************
 *************** BEGIN ACTOR ***************
 *******************************************/


// Actor lives on the stage at coordinates (x,y)
function Actor(stage, x, y) {
    this.stage = stage; // stage that the actor is on
    this.x = x;
    this.y = y;
}

// Get actor's coordinates
Actor.prototype.getCoords = function () {
    return [this.x, this.y];
};

// Set actor's coordinates
Actor.prototype.setCoords = function (x, y) {
    this.x = x;
    this.y = y;
};

// method stub - do nothing by default (like if you're a box or a wall)
Actor.prototype.step = function () {
};

// move actor to coordinates if possible
Actor.prototype.moveTo = function (x, y) {
    if (this.canMoveTo(x, y)) {
        this.setCoords(x, y);
    }
};

// check if actor can move to certain coordinates
Actor.prototype.canMoveTo = function (x, y) {
    return this.stage.validCoords(x, y) && this.stage.getActor(x, y) === undefined;
};

// get image to display for this actor
Actor.prototype.getImg = function () {
    return this.stage.blankImageSrc;
};

// method stub
Actor.prototype.getName = function () {
    return undefined;
};


/*****************************************
 *************** END ACTOR ***************
 *****************************************/


/********************************************
 *************** BEGIN PLAYER ***************
 ********************************************/


// Player inherits Actor
function Player(stage, x, y, ws) {
    Actor.call(this, stage, x, y);
    this.ws = ws;
}

Player.prototype = Object.create(Actor.prototype);
Player.prototype.constructor = Actor;

// directions that player can move in
let directions = {
    'n': [0, -1],
    's': [0, 1],
    'e': [1, 0],
    'w': [-1, 0]
};
Object.assign(directions, {
    'ne': vertAdd(directions['n'], directions['e']),
    'nw': vertAdd(directions['n'], directions['w']),
    'se': vertAdd(directions['s'], directions['e']),
    'sw': vertAdd(directions['s'], directions['w'])
});

// move in word direction ('n' = north, etc)
Player.prototype.move = function (direction) {
    if (this.stage.state !== RUNNING) {
        return;
    }

    // get direction
    let dirCoords = directions[direction];

    // invalid direction
    if (dirCoords === undefined) {
        return;
    }

    // if we'll jump into monster, just get it over with and lose
    let nextPos = vertAdd(this.getCoords(), dirCoords);
    if (this.stage.getActor(...nextPos) instanceof Monster) {
        this.setCoords(...nextPos);
        this.stage.onLose(this);
        return;
    }

    // record the actors we need to move (player & boxes)
    let actorsToMove = [this];

    // for each position, check if it's occupied by a box or w/e and act accordingly
    for (; ; nextPos = vertAdd(nextPos, dirCoords)) {
        // out of bounds, can't move it
        if (!this.stage.validCoords(...nextPos)) {
            return;
        }

        // get actor at pos
        let actor = this.stage.getActor(...nextPos);

        // if blank tile, success
        if (actor === undefined) {
            break;
        }

        // if box, add it to boxesToMove and continue
        if (actor instanceof Box) {
            actorsToMove.push(actor);
        }

        // otherwise, can't move it
        else {
            return;
        }
    }

    let oldBoard = this.stage.genBoard();

    // succeeded, move boxes ahead of us, then move us
    let actor;
    while (actor = actorsToMove.pop()) {
        actor.setCoords(...vertAdd(actor.getCoords(), dirCoords));
    }

    // send stage update
    this.stage.onUpdate(this.stage.getBoardDelta(oldBoard, this.stage.genBoard()));
};

Player.prototype.getName = function () {
    return 'player';
};

// leave current world (stage)
Player.prototype.leaveWorld = function () {
    this.stage.removeActor(this);
};


/********************************************
 *************** END PLAYER *****************
 ********************************************/


/********************************************
 *************** BEGIN BOX ******************
 ********************************************/


// Box inherits Actor
function Box(stage, x, y) {
    Actor.call(this, stage, x, y);
}

Box.prototype = Object.create(Actor.prototype);
Box.prototype.constructor = Actor;

Box.prototype.getName = function () {
    return 'box';
};


/********************************************
 *************** END BOX ********************
 ********************************************/


/********************************************
 *************** BEGIN WALL *****************
 ********************************************/


// Wall inherits Actor
function Wall(stage, x, y) {
    Actor.call(this, stage, x, y);
}

Wall.prototype = Object.create(Actor.prototype);
Wall.prototype.constructor = Actor;

Wall.prototype.getName = function () {
    return 'wall';
};


/********************************************
 *************** END WALL *******************
 ********************************************/


/********************************************
 *************** BEGIN MONSTER **************
 ********************************************/


// Monster inherits Actor
function Monster(stage, x, y) {
    Actor.call(this, stage, x, y);
}

Monster.prototype = Object.create(Actor.prototype);
Monster.prototype.constructor = Actor;

// unlike regular Actor, Monster can move to player's spot
Monster.prototype.canMoveTo = function (x, y) {
    if (this.stage.validCoords(x, y)) {
        let a = this.stage.getActor(x, y);
        return (a === undefined) || (a instanceof Player);
    }
    return false
};

// monster moves randomly
Monster.prototype.step = function () {
    // get valid moves
    let possibleMoves = Object.keys(directions).map((k) => directions[k]);
    let validMoves = possibleMoves.filter(move => this.canMoveTo(...vertAdd(this.getCoords(), move)));

    // if no valid moves, die
    if (validMoves.length === 0) {
        this.stage.deadActors.push(this);
        return;
    }

    // choose move
    let move = validMoves[rand(0, validMoves.length - 1)];
    this.moveTo(...vertAdd(this.getCoords(), move));
};

// handle eating player
Monster.prototype.moveTo = function (x, y) {
    if (this.canMoveTo(x, y)) {
        let a = this.stage.getActor(x, y);
        this.setCoords(x, y);

        // if move to player, kill player!
        if (a instanceof Player) {
            this.stage.onLose(a);
        }
    }
};

Monster.prototype.getName = function () {
    return 'monster';
};


/********************************************
 *************** END MONSTER ****************
 ********************************************/


/*************************************************
 *************** BEGIN BLUEMONSTER ***************
 *************************************************/


// Blue Monster inherits Actor
function BlueMonster(stage, x, y) {
    Monster.call(this, stage, x, y);
}

BlueMonster.prototype = Object.create(Monster.prototype);
BlueMonster.prototype.constructor = Monster;

// Blue Monster chases player
BlueMonster.prototype.step = function () {
    // get valid moves
    let possibleMoves = Object.keys(directions).map((k) => directions[k]);
    let validMoves = possibleMoves.filter(move => this.canMoveTo(...vertAdd(this.getCoords(), move)));

    // if no valid moves, die
    if (validMoves.length === 0) {
        this.stage.deadActors.push(this);
        return;
    }

    let bestMoves = [validMoves[0]];
    let h = this.heuristic(...vertAdd(this.getCoords(), bestMoves[0]));

    // choose move with best heuristic
    validMoves.forEach(move => {
        let h2 = this.heuristic(...vertAdd(this.getCoords(), move));
        if (h2 === h) {
            bestMoves.push(move);
        } else if (h2 < h) {
            h = h2;
            bestMoves = [move];
        }
    });

    // choose move
    let move = bestMoves[rand(0, bestMoves.length - 1)];
    this.moveTo(...vertAdd(this.getCoords(), move));
};

// Evaluate heuristic function at a position; the lower the result, the better to move there.
BlueMonster.prototype.heuristic = function (x, y) {
    let distances = this.stage.players.map(player => euclideanDist(player.getCoords(), [x, y]));
    return Math.min(...distances);
};

BlueMonster.prototype.getName = function () {
    return 'blueMonster';
};


/***********************************************
 *************** END BLUEMONSTER ***************
 ***********************************************/


/* Utility functions */

// perform element-wise operations on two vertices
function vertF(u, v, f) {
    if (u.length !== v.length) {
        console.log('err: vert lengths differ');
    }

    let ans = [];

    for (let i = 0; i < Math.min(u.length, v.length); i++) {
        ans.push(f(u[i], v[i]));
    }

    return ans;
}

// add two vertices
function vertAdd(u, v) {
    return vertF(u, v, (u_, v_) => u_ + v_);
}

// subtract two vertices
function vertSub(u, v) {
    return vertF(u, v, (u_, v_) => u_ - v_);
}

// euclidean distance between 2 vertices
function euclideanDist(u, v) {
    return Math.sqrt(vertSub(u, v).map(x => Math.pow(x, 2)).reduce((a, v) => a + v));
}

// gen random integer (min and max inclusive)
function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
