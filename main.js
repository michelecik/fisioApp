var fs = require('fs');
var express = require('express');
const bodyParser = require('body-parser')
var app = express();
app.use(bodyParser.json());
var http = require('http');
var https = require('https');
var privateKey = fs.readFileSync('sslcert/server.key', 'utf8');
var certificate = fs.readFileSync('sslcert/server.cert', 'utf8');
var credentials = { key: privateKey, cert: certificate };
var httpServer = http.createServer();
var httpsServer = https.createServer(credentials, app);

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
}

app.configure(function() {
    app.use(allowCrossDomain);
})

const jwt = require('jsonwebtoken');


// getting-started.js
var mongoose = require('mongoose');

mongoose.set('useFindAndModify', false);
mongoose.connect('mongodb://localhost:4321/fisio', { useNewUrlParser: true, useUnifiedTopology: true }, (err) => {
    if (err) {
        console.log('errorone')
        console.log(err)
    }
});


// test 
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function () {
    console.log('connected')
});

/* Todos */
// Routes per esercizi

var paziente = new mongoose.Schema({
    nome: String,
    cognome: String,
    username: String,
    password: String,
    esercizi_assegnati: [],
    inseritoDa: '',
    isActive: Boolean,
    isAdmin: Boolean
});

var esercizio = new mongoose.Schema({
    nome_esercizio: String,
    descrizione: String,
    gif_path: String
});

var assegnazione = new mongoose.Schema({
    paziente: paziente,
    id_esercizio: esercizio,
    numero_serie: Number,
    numero_ripetizioni: Number,
})

var Paziente = mongoose.model('paziente', paziente);
var Esercizio = mongoose.model('esercizio', esercizio);
var Assegnazione = mongoose.model('assegnazione', assegnazione);


/* Update 15/09 */
/* https://fisioapp.online - Inizio sviluppo frontend */
/* Bugs
    verifyAdmin
*/

/* TODO */
// Implementare controllo su esecizi assegnati (lato fe o be)
// D a j e

function verifyAdmin(data) {
    // data contains authdata from jwt
    // check if admin
    if(!data.user[0].isAdmin) {
        res.json({
            msg: 'solo admin è autorizzato a questa pagina'
        })
    }
}

app.get('/', (req, res) => {
    res.json({
        welcomeMessage: 'Welcome to the Fisio API'
    })
})

// LOGIN
app.post('/login', (req, res) => {

    console.log('got post req to login')
    var userInput = {
        _username: req.body.username,
        _psw: req.body.password
    }

    Paziente.find(
        {
            username: userInput._username,
            password: userInput._psw
        }, (err, user) => {
            if (err) {
                res.json({msg: 'forbidden'});
            }

            console.log(user)

            if (user == []) {
                res.json(
                    {
                        message: 'no user'
                    }
                )
            }


            jwt.sign({ user }, 'secretkey', (err, token) => {
                if (err) {
                    res.json(
                        {
                            err: err
                        }
                    )
                }
                res.json(
                    {
                        token,
                        user
                    }
                )
            })
        }
    )
})

// ADMIN
// serve ad Admin per recuperare i dati di tutti pazienti
app.get('/pazienti', verifyToken, (req, res) => {
    console.log('GET /pazienti');
    jwt.verify(req.token, 'secretkey', (err, authData) => {

        if (err) {
            res.json({
                yooo: 'error'
            })
        }

        console.log(authData.user[0].isAdmin)

        verifyAdmin(authData)
        

        // Get tutti i pazienti
        Paziente.find({}, (err, listaPazienti) => {
            if (err) {
                res.json({
                    msg: 'eeeerrore!'
                })
            }
            res.json({
                pazienti: listaPazienti
            })
        });
    });
})


app.get('/pazienti/:id', verifyToken, (req, res) => {
    Paziente.findById(req.params.id, (err, user) => {
        if (err) {
            res.sendStatus(403);
        }

        jwt.verify(req.token, 'secretkey', (err, authData) => {

            if (err) return next(err)
            
            verifyAdmin(authData)

            res.json(
                {
                    user: user
                }
            )
        })
    })
})


// Route per creare pazienti
app.post('/pazienti', verifyToken, (req, res) => {

    console.log('POST /pazienti')
    var nuovoUser = {
        nome: req.body.nome,
        cognome: req.body.cognome,
        esercizi_assegnati: req.body.esercizi_assegnati,
        username: req.body.username,
        password: req.body.password,
        inseritoDa: '',
        isActive: true,
        isAdmin: req.body.isAdmin
    }

    console.log(nuovoUser)

    jwt.verify(req.token, 'secretkey', (err, authData) => {
        if (err) {
            res.statusCode(500)
        }

        console.log('AUTH')
        console.log(authData)

        verifyAdmin(authData)

        nuovoUser.inseritoDa = authData.user._id
        insertUser = new Paziente(nuovoUser)

        insertUser.save(
            function (err, paziente) {
                if (err) {
                    console.log(err);
                }

                console.log(paziente.nome + ' è stato salvato')
                res.json(
                    {
                        message: 'user created',
                        user: paziente,
                        authData
                    }
                )
            }
        )
    })
})


// QUI INIZIANO LE ROUTE RELATIVI AGLI ESERCIZI

// get tutti gli esercizi disponibili
app.get('/esercizi', verifyToken, (req, res) => {

    jwt.verify(req.token, 'secretkey', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        }

        verifyAdmin(authData)

        var allEsercizi = Esercizio.find({}, (err, listaEsercizi) => {
            if (err) {
                res.sendStatus(403);
            }

            console.log(listaEsercizi)

            res.json({
                esercizi: listaEsercizi
            })

        })

    })
})


app.post('/esercizi', verifyToken, (req, res) => {

    var data = {
        nome_esercizio: req.body.nome_esercizio,
        descrizione: req.body.descrizione,
        gif_path: req.body.gif_path
    }

    // Check if isAdmin
    jwt.verify(req.token, 'secretkey', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        }

        verifyAdmin(authData)

        var newEs = new Esercizio(data)

        newEs.save((err, saved) => {
            if (err) {
                res.sendStatus(403)
            }

            res.json({
                msg: 'esercizio inserito correttamente',
                esercizio: saved
            })

        })
    })

})

// ROUTE PER ASSEGNARE ESERCIZI A PAZIENTI PER ID
// lato client immagino una lista di pazienti (ritornata da get /pazienti) quindi ad ogni paziente sarà assegnato l'id di MongoDB
// id utente viene passato tramite parametro nell url
// l'ID dell'esercizio viene passato nel body della richiesta

// sempre lato client, una volta selezionato il paziente, verrà visualizzata la lista degli esercizi disponibili ( ritornata da get /esercizi )
// admin potrà selezionare uno o piu esercizi
app.put('/pazienti/:id', verifyToken, (req, res) => {

    // QUI RICEVO LA LISTA DI ESERCIZI COMPLETI
    var esercizi_assegnati = req.body.esercizi_assegnati;

    console.log(esercizi_assegnati)

    // check if logged
    jwt.verify(req.token, 'secretkey', (err, authData) => {

        verifyAdmin(authData)

        var paziente = Paziente.findById(req.params.id, (err, paziente) => {
            if (err) return next(err);

            paziente.esercizi_assegnati = esercizi_assegnati
            paziente.save((error, updatedPaziente) => {
                if (error) return next(error);
                res.json({ updatedPaziente });
            })
        })
    })
});

// format of token:
// Authorization: Bearer <access_token>
function verifyToken(req, res, next) {
    const bearerHeader = req.headers['authorization'];
    // check if undefined
    if (typeof bearerHeader != 'undefined') {

        // split at the space
        const bearer = bearerHeader.split(' ');

        // get token from array
        const bearerToken = bearer[1];

        req.token = bearerToken;

        console.log(bearerToken)

        next();
    } else {
        // forbidden
        res.json({
            msg: 'devi loggare'
        });
    }
}

httpsServer.listen(443, (err) => {
    if (err) {
        console.log('errore:', err);
    } else {
        console.log('https ci siamo')
    }
});

httpServer.listen(80, (err) => {
    if (err) {
        console.log('errore:', err);
    } else {
        console.log('http presente')
    }
});