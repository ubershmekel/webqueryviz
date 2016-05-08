var express = require('express');
var consolidate = require('consolidate');
var passwordless = require('passwordless');

var models = require('./models');
var dbTypesArray = require('./connectors').dbTypesArray;
var config = require('./config');

var router = express.Router();

function render(req, res, view, options) {
    options.partials = {
        header: "header",
    };
    options.user = req.user;
    res.render(view, options);
}

///////////////////////////////////////////////////////////////////////////////
// Home page
///////////////////////////////////////////////////////////////////////////////
router.get('/', function(req, res) {
    var templateData = {
        title: "Web Query Chart"
    };
    if(req.user) {
        models.getEverything(function(err, docs) {
            templateData.docs = docs;
            render(req, res, 'index', templateData);
        });
    } else {
        render(req, res, 'index', templateData);
    }
});

///////////////////////////////////////////////////////////////////////////////
// Passwordless
///////////////////////////////////////////////////////////////////////////////
/* GET restricted site. */
router.get('/restricted', passwordless.restricted(), function(req, res) {
    render(req, res, 'restricted', {title: "Restricted Page"});
});


/* GET login screen. */
router.get('/login', function(req, res) {
    render(req, res, 'login', {title: "Log in"});
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
    render(req, res, 'sent', {title: "Sent Token"});
}
var requestTokenMiddleware = passwordless.requestToken(onRequestToken);
router.post('/sendtoken', requestTokenMiddleware, onTokenSent);


///////////////////////////////////////////////////////////////////////////////
// Create read update delete
///////////////////////////////////////////////////////////////////////////////
router.get('/edit/:id?/:slug?', passwordless.restricted(), function(req, res) {
    models.getEverything( function(err, docs) {
        var templateData = {
            title: "Edit Objects",
            editObjectId: req.params.id,
            err: err,
            docs: JSON.stringify(docs),
            dbTypesArray: JSON.stringify(dbTypesArray),
            modelTypesArray: JSON.stringify(models.modelTypesArray),
        };
        render(req, res, 'edit', templateData);
    });
});

router.post('/edit', passwordless.restricted(), function(req, res) {
    var newDocs = req.body;

    var ids = [];
    for(var i = 0; i < newDocs.length; i++) {
        models.updateObj(newDocs[i], function(err, newDoc){
        }); 
        ids.push(newDocs[i]._id);
    }
    
    models.deleteOtherIds(ids, function(err, numRemoved) {
    });
    
    res.status(200);
});

///////////////////////////////////////////////////////////////////////////////
// Data Source and API routes
///////////////////////////////////////////////////////////////////////////////
router.get('/query/:slug', passwordless.restricted(), function(req, res) {
    var slug = req.params.slug;
    models.getQueryData(slug, function(err, rows) {
        if(err){
            res.status(500).send('500: Something broke!' + err);
        } else {
            if (!rows || rows.length === 0)
                res.status(404).send('404: Could not find data for slug: "' + slug + '"');
            else
                res.json(rows);
        }
    })
});


module.exports = router;