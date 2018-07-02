require('./static-content-react/lib/constants.js'); // ports n stuff

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const crypto = require('crypto'); // md5
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();

// secret jwt key (don't look, TA!)
app.set('jwtsecret', '4j9gja9j03h2g08h31y0yg80wg80');

// body parser
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({extended: true})); // support encoded bodies

// will create the db if it does not exist
const db = new sqlite3.Database('db/database.db', (err) => {
    if (err) {
        console.log(`err connecting to db: ${err.message}`);
    }
    console.log('Connected to the database.');
});

// static content
// app.use(express.static('static-content'));
app.use(express.static('static-content-react'));

// cookie parser
app.use(cookieParser());

// authenticate a user with their token, or send them back
function authenticate(req, res, next) {
    let token = req.cookies.token;

    if (!token) {
        res.status(401);
        res.json({error: 'missing token'});
        return;
    }

    jwt.verify(token, app.get('jwtsecret'), function (err, decoded) {
        if (err) {
            res.clearCookie('token');
            res.status(401);
            res.json({error: 'failed to authenticate token'});
            return;
        }

        // store decoded payload in request
        req.decoded = decoded;
        next();
    })
}

// check that we're successfully authenticated
app.get('/api/auth/', authenticate, function (req, res) {
    res.status(200);
    res.json({user: req.decoded.user, token: req.cookies.token});
});

// logout
app.post('/api/logout/', function (req, res) {
    res.status(200);
    res.clearCookie('token');
    res.json({});
});

// login
app.post('/api/login/', function (req, res) {
    // validate inputs
    let badkey = validate(req.body, ['id']);
    if (badkey !== undefined) {
        res.status(400);
        res.json({error: `value of ${badkey} is not alphanumeric, but should be.`});
        return;
    }

    let sql = 'SELECT * FROM appuser WHERE id=? AND password=?';

    db.get(sql, [req.body.id, md5(req.body.password)], (err, row) => {
        if (err) {
            res.status(500);
            res.json({error: err.message});
        } else if (!row) {
            res.status(401);
            res.json({error: 'invalid username or password'});
        } else {
            // successful login
            delete row.password;

            // generate token
            let token = jwt.sign({user: {id: row.id}}, app.get('jwtsecret'), {
                expiresIn: '1d' // expires in 24 hours
            });
            res.cookie('token', token, {httpOnly: true, expires: new Date(Date.now() + 1000 * 60 * 60 * 24)});

            res.status(200);
            res.json({user: row, token: token});
        }
    });
});

// create user
app.post('/api/create_user/', function (req, res) {
    // validate inputs
    let badkey = validate(req.body, ['id', 'name']);
    if (badkey !== undefined) {
        res.status(400);
        res.json({error: `value of ${badkey} is not alphanumeric, but should be.`});
        return;
    }

    let sql = '' +
        'INSERT INTO appuser(id, password, name) ' +
        'VALUES(?, ?, ?)';

    db.run(sql, [req.body.id, md5(req.body.password), req.body.name], function (err) {
        if (err) {
            res.status(409);
            res.json({error: `user already exists: ${err.message}`});
        } else {
            // success
            res.status(201);
            res.json({});
        }
    });
});

// update user
// requires you to be authenticated
app.post('/api/update_user/', authenticate, function (req, res) {
    let user = req.body.user; // user updates

    // just in case
    if (user === undefined) {
        return;
    }

    // validate inputs
    let badkey = validate(req.body.user, ['name']);
    if (badkey !== undefined) {
        res.status(400);
        res.json({error: `value of ${badkey} is not alphanumeric, but should be.`});
        return;
    }

    // whitelist of fields we can update
    let whitelist = ['password', 'name'];

    let updates = {};
    whitelist.forEach(field => {
        if (user[field] !== undefined) {
            updates[field] = user[field];
        }
    });

    // if no updates, we good
    let keys = Object.keys(updates);
    if (keys.length === 0) {
        res.status(200);
        res.json({});
        return;
    }

    // prep sql statement and params
    let sql = '' +
        'UPDATE appuser ' +
        'SET ';
    let params = [];
    for (let i = 0; i < keys.length; i++) {
        // key is whitelisted so we can insert it directly
        let key = keys[i];
        sql += `${key}=?${(i < (keys.length - 1)) ? ',' : ''} `;

        // handle password case
        if (key === 'password') {
            params.push(md5(updates[key]));
        }
        else {
            params.push(updates[key]);
        }
    }
    sql += 'WHERE id=?';
    params.push(req.decoded.user.id);

    // execute
    db.run(sql, params, err => {
        if (err) {
            res.status(500);
            res.json({error: err.message});
        } else {
            // success
            res.status(200);
            res.json({});
            console.log(`${keys} updated`);
        }
    });
});

// delete user
// requires authentication
app.delete('/api/delete_user/', authenticate, function (req, res) {
    let user = req.decoded.user.id;

    let sql = '' +
        'DELETE FROM appuser ' +
        'WHERE id = ?';

    db.run(sql, [user], err => {
        if (err) {
            res.status(500);
            res.json({error: err.message});
        } else {
            // success
            res.status(200);
            res.clearCookie('token');
            res.json({});
        }
    });
});

// get user
// requires authentication
app.get('/api/user/', authenticate, function (req, res) {
    let user = req.decoded.user.id;

    let sql = '' +
        'SELECT * ' +
        'FROM appuser ' +
        'WHERE id = ?';

    db.get(sql, [user], (err, row) => {
        if (err) {
            res.status(500);
            res.json({error: err.message});
        } else if (!row) {
            res.status(404);
            res.json({error: 'your user was not found?'});
        } else {
            // found
            delete row.password;
            res.status(200);
            res.json({'user': row});
        }
    });
});

// user won
// requires authentication
app.post('/api/win/', authenticate, function (req, res) {
    let user = req.decoded.user;
    let score = req.body.score;

    // validate inputs
    let badkey = validate(req.body, ['id']);
    if (badkey !== undefined) {
        res.status(400);
        res.json({error: `value of ${badkey} is not alphanumeric, but should be.`});
        return;
    }

    score = parseInt(score);

    let sql = '' +
        'UPDATE appuser ' +
        'SET score = score + ? ' +
        'WHERE id = ?';

    db.run(sql, [score, user.id], err => {
        if (err) {
            res.status(500);
            res.json({error: err.message});
        } else {
            // success
            res.status(200);
            res.json({});
        }
    });
});

// get high scores
app.get('/api/high_scores/', function (req, res) {
    let sql = '' +
        'SELECT id, score ' +
        'FROM appuser ' +
        'ORDER BY score DESC, name ASC ' +
        'LIMIT 10';

    // get top 10 high scores
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500);
            res.json({error: err.message});
        } else {
            // success
            res.status(200);
            res.json({scores: rows || []});
        }
    });
});

// run on port!
app.listen(wwPort, function () {
    console.log('Example app listening on port ' + wwPort);
});

// md5 hash of string
function md5(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}

// validate string input by making sure it's all alphanumeric.
// return first key that breaks validation, or undefined.
function validate(obj, keys) {
    for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        if (obj[key] !== undefined && !alphanumeric(obj[key])) {
            return key;
        }
    }
    return undefined;
}

// check if string is alphanumeric
function alphanumeric(str) {
    return str.match(/^[a-zA-Z0-9]*$/) !== null;
}

