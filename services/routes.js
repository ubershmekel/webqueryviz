var express = require('express');
var passwordless = require('passwordless');

var models = require('./models');
var config = require('./config');


var router = express.Router();

///////////////////////////////////////////////////////////////////////////////
// Passwordless
///////////////////////////////////////////////////////////////////////////////
/* GET home page. */
router.get('/', function(req, res) {
    res.render('index', { user: req.user });
});

/* GET restricted site. */
router.get('/restricted', passwordless.restricted(), function(req, res) {
    res.render('restricted', { user: req.user });
});

/* GET login screen. */
router.get('/login', function(req, res) {
    res.render('login', { user: req.user });
});

/* GET logout. */
router.get('/logout', passwordless.logout(), function(req, res) {
    res.redirect('/');
});

/* POST login screen. */
function onRequestToken(user, delivery, callback) {
    console.log("delivery: " + delivery);
    if(!config.users || config.users.length == 0) {
        console.warn("No users configured. Please add users to config.json");
        return;
    }
    var userIndex = config.users.indexOf(user);
    if(userIndex === -1) {
        // deny
        callback(null, null);
        console.warn("Unregistered user: '" + user + "'");
    } else {
        // allow
        callback(null, user)
    }
}
function onTokenSent(req, res) {
    res.render('sent');
}
var requestTokenMiddleware = passwordless.requestToken(onRequestToken);
router.post('/sendtoken', requestTokenMiddleware, onTokenSent);

///////////////////////////////////////////////////////////////////////////////
// Data Source and API routes
///////////////////////////////////////////////////////////////////////////////
router.get('/query/:id', passwordless.restricted(), function(req, res) {
    var docId = req.params.id;
    models.getQueryData(docId, function(err, rows) {
        if(err)
            res.status(500).send('500: Something broke!' + err);
        else if (!rows || rows.length === 0)
            res.status(404).send('404: Could not find query id: "' + docId + '"');
        else
            res.json(rows);
    })
});


module.exports = router;