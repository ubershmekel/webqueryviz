var path = require('path');

var express = require('express');
var consolidate = require('consolidate');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var bodyParser = require('body-parser');
var passwordless = require('passwordless');
var passwordlessNedb = require('passwordless-nedb')
var nedb = require('nedb');
var email   = require("emailjs");

var routes = require('./services/routes');
var config = require('./services/config');

var dbFolder = path.join(__dirname, 'db');

var app = express();
var port = process.env.PORT || 3000;
app.set('port', port);

// TODO: Update `host` to this webapp that's linked via email
var host = 'http://localhost:' + port + '/';

var smtpServer = null;
var tokenDeliveryMethod = "console.log";
if(config.smtp)
    smtpServer = email.server.connect(config.smtp);


///////////////////////////////////////////////////////////////////////////////
// Setup of Passwordless
///////////////////////////////////////////////////////////////////////////////
var tokensDB = new nedb({
    filename: path.join(dbFolder, 'authTokens.nedb'),
    autoload: true
});
var usersTokenStore = new passwordlessNedb(tokensDB);
passwordless.init(usersTokenStore, {
    skipForceSessionSave: false
});
function deliverToken(tokenToSend, uidToSend, recipient, callback) {
    var activationUrl = host + '?token=' + tokenToSend + '&uid=' + encodeURIComponent(uidToSend);
    var text = 'Hello!\nYou can now access your account here: ' + activationUrl;
    if(smtpServer) {
        smtpServer.send({
            text: text, 
            from:    config.smtp.from, 
            to:      recipient,
            subject: 'Token for ' + host
        }, function(err, message) { 
            if(err) {
                console.log(err);
            }
            callback(err);
        });
    } else {
        console.log("No SMTP server configured. Would have sent an email to: " + recipient);
        console.log(text);
        callback(null);
    }
}
passwordless.addDelivery(deliverToken);

///////////////////////////////////////////////////////////////////////////////
// Express setup
///////////////////////////////////////////////////////////////////////////////
// view engine
// assign the templtae engine to .html files 
app.engine('html', consolidate.mustache);

// set .html as the default extension 
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));


app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());

///////////////////////////////////////////////////////////////////////////////
// Session store setup
///////////////////////////////////////////////////////////////////////////////
var NedbStore = require('nedb-session-store')( expressSession );
var sessionStore = new NedbStore({
    filename: path.join(dbFolder, 'sessions.nedb')
});
var oneYearMs = 365 * 24 * 60 * 60 * 1000;
var sessionWare = expressSession({
    secret: 'horse staple correct',
    saveUninitialized: false,
    resave: false,
    cookie: {
        path: '/',
        httpOnly: true,
        maxAge: oneYearMs 
    },    
    store: sessionStore
});

// Passwordless middleware
app.use(sessionWare);
var existingSessionAuthWare = passwordless.sessionSupport();
app.use(existingSessionAuthWare);
var newSessionAuthWare = passwordless.acceptToken({ successRedirect: '/' });
app.use(newSessionAuthWare);

///////////////////////////////////////////////////////////////////////////////
// Routes setup 
///////////////////////////////////////////////////////////////////////////////
// CHECK /routes/index.js to better understand which routes are needed at a minimum
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', routes);

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found: ' + req.originalUrl);
    err.status = 404;
    next(err);
});

// Development error handler
// Shows stack traces
app.use(function(err, req, res, next) {
    console.error(err);
    
    if(err.status !== 404)
        console.error(err.stack);

    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: err
    });
});


var server = app.listen(app.get('port'), function() {
    console.log('Browse at: ' + host);
});

//TODO: make socketio work with passwordless.

var ioLib = require('socket.io');
var io = ioLib(server);
/*
io.use(function(socket, next) {
    // fake it to be like express
    socket.request.query = {}; 
    var fakeRes = {
        end: function() {
            socket.close();
        }
    }
    
    sessionWare(socket.request, fakeRes, next);
    existingSessionAuthWare(socket.request, fakeRes, next);
    newSessionAuthWare(socket.request, fakeRes, next);
    var restrictMiddleware = passwordless.restricted();
    restrictMiddleware(socket.request, fakeRes, next);
    //if (socket.request.headers.cookie)
    //    return next();
    //next(new Error('Authentication error'));
});
*/

var models = require('./services/models');
io.on('connection', function(socket) {
    // TODO: passwordless middleware
     socket.emit('hello', 'whatcha doing?');
     socket.on('getQueryDataFromDoc', models.getQueryDataFromDoc);
});


server.listen(app.get('port'));

