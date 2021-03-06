var fs = require('fs');
var express = require('express');
var cors = require('cors')
const bodyParser = require('body-parser')
var app = express();
app.use(bodyParser.json())
app.use(cors())
var http = require('http');
var https = require('https');
var privateKey = fs.readFileSync('sslcert/server.key', 'utf8');
var certificate = fs.readFileSync('sslcert/server.cert', 'utf8');
var credentials = { key: privateKey, cert: certificate };
var httpServer = http.createServer();
var httpsServer = https.createServer(credentials, app);

const jwt = require('jsonwebtoken');
app.use(express.static(__dirname + '/public'));
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Authorization, Access-Control-Allow-Headers, Content-Type, Accept");
    res.header("Access-Control-Allow-Origin", "*");  
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    next();
  });

// getting-started.js
var mongoose = require('mongoose');

mongoose.set('useFindAndModify', false);
mongoose.connect('mongodb://localhost:27017/fisio', { useNewUrlParser: true, useUnifiedTopology: true }, (err) => {
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

var user = new mongoose.Schema({
    nome: String,
    username: String,
    password: String
})

var Paziente = mongoose.model('paziente', paziente);
var Esercizio = mongoose.model('esercizio', esercizio);
var Assegnazione = mongoose.model('assegnazione', assegnazione);
var User = mongoose.model('user', user);



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

    User.find(
        {
            username: userInput._username,
            password: userInput._psw
        }, (err, user) => {
            if (err) {
                res.json({msg: 'no'})
            }

            console.log(user);

            if(user==[]) {
                res.json(
                    {
                        message: 'no user'
                    }
                )
            }

            jwt.sign({user}, 'secretkey', (err, token) => {
                if (err) {
                    res.json(
                        {
                            msg: 'errore jwt'
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
app.get('/pazienti', (req, res) => {
    console.log('GET /pazienti');
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
})


app.get('/pazienti/:id', (req, res) => {
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
app.post('/pazienti', (req, res) => {

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

    nuovoUser = new Paziente(nuovoUser)

    nuovoUser.save(
        function (err, paziente) {
            if (err) {
                console.log(err);
            }

            console.log(paziente.nome + ' è stato salvato')
            res.json(
                {
                    message: 'user created',
                    user: paziente,
                }
            )
        }
    )
})


// QUI INIZIANO LE ROUTE RELATIVI AGLI ESERCIZI

// get tutti gli esercizi disponibili
app.get('/esercizi', (req, res) => {

    jwt.verify(req.token, 'secretkey', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        }

        // verifyAdmin(authData)
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


app.post('/esercizi', (req, res) => {

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
app.put('/pazienti/:id', (req, res) => {

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