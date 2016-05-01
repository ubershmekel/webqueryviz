var path = require('path');
var fs = require('fs');

var nedb = require('nedb');
var sqlite3 = require('sqlite3');

var db = new nedb({
    filename: path.join(__dirname, '..', 'db', 'site.nedb'),
    autoload: true
});

var dbTypes = {
    sqlite: 'sqlite'
}

var modelTypes = {
    source: "source",
    query: "query",
    viz: "viz"
}

function newObj(doc) {
    db.insert(doc, function(err, newDoc) {
        if(err)
            console.log("Failed inserting doc: " + err);
    });
}

function fetchSQLite(filepath, query, callback) {
    var mode = sqlite3.OPEN_READONLY;
    var sqliteDb = new sqlite3.Database(filepath, mode, function(err) {
        if(err) {
            console.warn("Failed to connect to sqlite: '" + filepath + "' with error: " + err)
        }
    });
    sqliteDb.all(query, function(err, rows) {
        if(err)
            console.warn("Failed querying sqlite: '" + query + "' with error: " + err);
        callback(err, rows);
    });
}

exports.getQueryData = function(queryDoc, callback) {
    var docToFind = {
        _id: queryDoc.sourceId,
        type: modelTypes.source
    };
    db.find(docToFind, function (err, docs) {
        if(err) {
            console.warn("Failed querying sqlite: '" + query + "' with error: " + err);
            callback(err);
        }
        var source = docs[0];
        if(source.dbType === dbTypes.sqlite) {
            fetchSQLite(source.filepath, queryDoc.query, callback);
        } else {
            var warn = "No db type handler for: '" + source.dbType;
            console.warn(warn);
            var err = {message: warn, doc: queryDoc};
            callback(err);
        }
    });
}

exports.getQueryList = function(callback) {
    db.find({ type: modelTypes.query }, function (err, docs) {
        // docs is an array containing documents Mars, Earth, Jupiter
        // If no document is found, docs is equal to []
        callback(err, docs);
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
        query: 'SELECT date, latency FROM pings ORDER BY date DESC LIMIT 1000',
        type: modelTypes.query
    });
}
main();

