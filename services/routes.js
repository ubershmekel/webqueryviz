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
function setupQueryRoutes(err, docs) {
    if(err) {
        console.error("Failed to fetch queries for web APIs");
        return;
    }
    var baseUrl = '/query/';
    
    docs.forEach(function(queryDoc) {
        var url = baseUrl + queryDoc._id;
        router.get(url, passwordless.restricted(), function(req, res) {
            models.getQueryData(queryDoc, function(err, rows) {
                if(err)
                    res.status(500).send('Something broke!' + err);
                else
                    res.json(rows);
            })
        });
    });
}
models.getQueryList(setupQueryRoutes);




module.exports = router;