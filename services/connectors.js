var sqlite3 = require('sqlite3');
var Teradata = require("teradata");
var mysql = require('mysql');


var dbTypes = {
    sqlite: 'sqlite',
    teradata: 'teradata',
    mysql: 'mysql',
}
var dbTypesArray = Object.keys(dbTypes);



dbFetch = {};

///////////////////////////////////////////////////////////////////////////////
// SQLite
///////////////////////////////////////////////////////////////////////////////
dbFetch[dbTypes.sqlite] = function(sourceDoc, queryDoc, callback) {
    var filepath = sourceDoc.filepath;
    var query = queryDoc.query;
    var mode = sqlite3.OPEN_READONLY;
    var sqliteDb = new sqlite3.Database(filepath, mode, function(err) {
        if(err) {
            console.warn("Failed to connect to sqlite: '" + filepath + "' with error: " + err)
            // No need to call `callback(err);`
            // It will be called by the query.
        }
    });
    sqliteDb.all(query, function(err, rows) {
        if(err)
            console.warn("Failed querying sqlite: '" + query + "' with error: " + err);
        callback(err, rows);
    });
}

///////////////////////////////////////////////////////////////////////////////
// Teradata
///////////////////////////////////////////////////////////////////////////////
dbFetch[dbTypes.teradata] = function(sourceDoc, queryDoc, callback) {
    Teradata.connect(sourceDoc.host, sourceDoc.username, sourceDoc.password)
        .then(function () {
            return Teradata.executeQuery(queryDoc.query, queryDoc.limit);
        })
        .then(function (records) {
            //console.log("Updated %d records", updateCount);
            var err = null;
            callback(err, records);
            return Teradata.disconnect();
        });
};

///////////////////////////////////////////////////////////////////////////////
// MySQL
///////////////////////////////////////////////////////////////////////////////
dbFetch[dbTypes.mysql] = function(sourceDoc, queryDoc, callback) {
    var host = sourceDoc.host;
    var username = sourceDoc.username;
    var password = sourceDoc.password;
    var database = queryDoc.database;
    var query = queryDoc.query;
    
    var connection = mysql.createConnection({
        host     : host,
        user     : username,
        password : password,
        database : database
    });

    connection.connect();

    connection.query(query, function(err, rows, fields) {
        //console.log('The solution is: ', rows[0].solution);
        callback(err, rows);
    });

    connection.end();
};


///////////////////////////////////////////////////////////////////////////////
// Exports
///////////////////////////////////////////////////////////////////////////////
exports.dbFetch = dbFetch;
exports.dbTypes = dbTypes;
exports.dbTypesArray = dbTypesArray;
