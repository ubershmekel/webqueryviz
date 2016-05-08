var path = require('path');
var fs = require('fs');

var nedb = require('nedb');
var LRU = require("lru-cache");

var connectors = require("./connectors");
var dbFetch = connectors.dbFetch;
var dbTypes = connectors.dbTypes;

var hourInMs = 1000 * 60 * 60;
var options = {
    max: 1,
    maxAge: hourInMs * 4
};

var cache = LRU(options);

var siteDB = new nedb({
    filename: path.join(__dirname, '..', 'db', 'site.nedb'),
    autoload: true
});


/*
No need to be unique - we'll always have id and slug
siteDB.ensureIndex({ fieldName: 'slug', unique: true }, function (err) {
    if(err)
        console.error("Failed to set unique constraint");
});*/


var modelTypes = {
    source: "source",
    query: "query",
    viz: "viz"
}
var modelTypesArray = Object.keys(modelTypes);

function newObj(doc, callback) {
    siteDB.insert(doc, callback || function(err, newDoc) {
        if(err)
            console.log("Failed inserting doc: " + err);
    });
}



exports.getQueryDoc = function(slug, callback  /*function (err, docs)*/) {
    // docs is an array containing documents Mars, Earth, Jupiter
    // If no document is found, docs is equal to []
    var docToFind = {
        slug: slug,
        type: modelTypes.query
    };
    return siteDB.find(docToFind, callback);
}

function fetch(sourceDoc, queryDoc, callback) {
    var fetchFunc = dbFetch[sourceDoc.dbType];
    if(fetchFunc) {
        fetchFunc(sourceDoc, queryDoc, callback);
    } else {
        var warn = "No db type handler for: '" + sourceDoc.dbType;
        console.warn(warn);
        var err = {message: warn, doc: queryDoc};
        callback(err);
        return;
    }
}

exports.getQueryData = function(slug, callback) {
    exports.getQueryDoc(slug, function(err, queryDocsList){
        if(err || queryDocsList.length == 0) {
            console.warn("Failed getting query: '" + id + "' with error: " + err);
            callback(err);
            return;
        }

        var queryDoc = queryDocsList[0];

        var sourceToFind = {
            _id: queryDoc.sourceId,
            type: modelTypes.source
        };

        siteDB.find(sourceToFind, function (err, sourcesList) {
            if(err || !sourcesList || sourcesList.length === 0) {
                console.warn("Failed getting source: '" + queryDoc.sourceId + "' with error: " + err);
                callback(err);
                return;
            }
            var sourceDoc = sourcesList[0];

            var cacheKey = JSON.stringify([sourceDoc, queryDoc]);
            var val = cache.get(cacheKey);
            if (val) {
                // cache hit
                callback(null, val);
                //console.log('Cache hit: ', cacheKey);
            } else {
                //console.log('Not cache hit:' , cacheKey)
                fetch(sourceDoc, queryDoc, function(err, records) {
                    if(!err) {
                        //console.log('cache set: ', cacheKey);
                        cache.set(cacheKey, records);
                    }
                    callback(err, records);
                });
            }
        });
    });
};

exports.getQueryList = function(callback) {
    siteDB.find({ type: modelTypes.query }, function (err, docs) {
        // docs is an array containing documents Mars, Earth, Jupiter
        // If no document is found, docs is equal to []
        callback(err, docs);
    });
}

exports.getVizList = function(callback) {
    siteDB.find({ type: modelTypes.viz }, function (err, docs) {
        // docs is an array containing documents Mars, Earth, Jupiter
        // If no document is found, docs is equal to []
        callback(err, docs);
    });
}

exports.getEverything = function(callback) {
    // Ignore "deleted" objects
    siteDB.find({deleted: {$exists: false}}).exec(function (err, docsList) {
        // docs is an array containing documents Mars, Earth, Jupiter
        // If no document is found, docs is equal to []
        
        // Group by type
        var objectsByType = {};
        for(var i = 0; i < docsList.length; i++) {
            var doc = docsList[i];
            var type = doc.type;
            if(!objectsByType[type])
                objectsByType[type] = [];
            objectsByType[type].push(doc);
        }
        
        callback(err, objectsByType);
    });
}

exports.deleteOtherIds = function(ids, callback) {
    // Note we don't actually delete anything - we just mark it as "deleted"
    var update = {
        $set: { deleted: true }
    }
    var options = {
        multi: true
    }
    siteDB.update({_id: {$nin: ids}}, update, options, function(err, numAffected, affectedDocuments, upsert) {
        console.log("deleted: " + numAffected);
        if(err)
            console.warn("Failed deleting docs: " + err);
        callback(err, numAffected);
    });
}

exports.updateObj = function(doc, callback) {
    var options = {
        upsert: true
    }
    var query = {_id: doc._id};
    siteDB.update(query, doc, options, function(err, numAffected, affectedDocuments, upsert) {
        if(err)
            console.warn("Failed updating doc: " + err);
        callback(err, numAffected);
    });
}


function main() {
    // Temp gui for adding viz
    newObj({
        type: modelTypes.source,
        _id: "1",
        slug: 'google_ping_db',
        dbType: dbTypes.sqlite,
        name: 'My pings to 8.8.8.8',
        filepath: 'E:\\1stuff\\Dropbox\\dev\\python\\pinglog\\8.8.8.8.sqlite',
    });
    newObj({
        type: modelTypes.query,
        _id: "2",
        slug: 'latest_google_pings',
        name: '8.8.8.8 Latency and double',
        sourceId: '1',
        query: 'SELECT date, latency, latency * 2 AS dlat FROM pings ORDER BY date DESC LIMIT 1000',
    });
    newObj({
        type: modelTypes.viz,
        _id: "3",
        slug: 'test_viz',
        name: "Recent Pings To Google's 8.8.8.8",
        queryId: '2',
        href: '/gfilter/?dl=/query/latest_google_pings&type=json&viz=plot&xprop=date',
    });
}

main();

exports.modelTypesArray = modelTypesArray;
exports.newObj = newObj;
