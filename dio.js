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
app.use(function (req, res, next) {
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

/* Update 15/09 */
/* https://fisioapp.online - Inizio sviluppo frontend */
/* 
    Bugs
    verifyAdmin
*/

/* TODO BACKEND */
// rifare login
// gestire bene a modo il token tra le varie richieste
// finire TUTTA la parte di utenza amministratore ( crea paziente / assegna esercizi / crea esercizi [ low priority ])
// test test test test test

/* TODO FRONTEND */
// finire TUTTA la parte di utenza amministratore ( crea paziente / assegna esercizi / crea esercizi [ low priority ])
// creare nuovo componente all'interno di nuovoPaziente per assegnare gli esercizi ( dovrà mostrare tutti gli esercizi disponibili )


app.get('/', (req, res) => {
    res.json({
        welcomeMessage: 'Welcome to the Fisio API'
    })
})


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