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


var modelTypes = {
    source: "source",
    query: "query",
    viz: "viz"
}
var modelTypesArray = Object.keys(modelTypes);

function newObj(doc) {
    siteDB.insert(doc, function(err, newDoc) {
        if(err)
            console.log("Failed inserting doc: " + err);
    });
}



exports.getQueryDoc = function(id, callback  /*function (err, docs)*/) {
    // docs is an array containing documents Mars, Earth, Jupiter
    // If no document is found, docs is equal to []
    var docToFind = {
        _id: id,
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

exports.getQueryData = function(id, callback) {
    exports.getQueryDoc(id, function(err, docs){
        if(err || docs.length == 0) {
            console.warn("Failed getting query: '" + id + "' with error: " + err);
            callback(err);
            return;
        }

        var queryDoc = docs[0];

        var sourceToFind = {
            _id: queryDoc.sourceId,
            type: modelTypes.source
        };

        siteDB.find(sourceToFind, function (err, docs) {
            if(err) {
                console.warn("Failed getting source: '" + queryDoc.sourceId + "' with error: " + err);
                callback(err);
                return;
            }
            var sourceDoc = docs[0];

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
    siteDB.find({deleted: {$exists: false}}, function (err, docs) {
        // docs is an array containing documents Mars, Earth, Jupiter
        // If no document is found, docs is equal to []
        callback(err, docs);
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
    siteDB.update({_id: doc._id}, doc, options, function(err, numAffected, affectedDocuments, upsert) {
        if(err)
            console.warn("Failed updating doc: " + err);
        callback(err, numAffected);
    });
}


function main() {
    // Temp gui for adding viz
    newObj({
        _id: 'google_ping_db',
        dbType: dbTypes.sqlite,
        filepath: 'E:\\1stuff\\Dropbox\\dev\\python\\pinglog\\8.8.8.8.sqlite',
        type: modelTypes.source
    });
    newObj({
        _id: 'latest_google_pings',
        sourceId: 'google_ping_db',
        query: 'SELECT date, latency, latency * 2 AS dlat FROM pings ORDER BY date DESC LIMIT 1000',
        type: modelTypes.query
    });
    newObj({
        _id: 'test_viz',
        name: "Recent Pings To Google's 8.8.8.8",
        queryId: 'latest_google_pings',
        href: '/gfilter/?dl=/query/latest_google_pings&type=json&viz=plot&xprop=date',
        type: modelTypes.viz
    });
}

main();

exports.modelTypesArray = modelTypesArray;