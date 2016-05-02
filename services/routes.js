var express = require('express');
var router = express.Router();
var models = require('./models');

var passwordless = require('passwordless');
// var passwordless = require('../../../');


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
    // Simply accept every user
    callback(null, user);
    // usually you would want something like:
    // User.find({email: user}, callback(ret) {
    //         if(ret)
    //             callback(null, ret.id)
    //         else
    //             callback(null, null)
    // })
}
function onTokenSent(req, res) {
    res.render('sent', {delivery: delivery});
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