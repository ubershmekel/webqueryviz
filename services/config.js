var path = require('path');
var fs = require('fs');

///////////////////////////////////////////////////////////////////////////////
// Setup configuration
///////////////////////////////////////////////////////////////////////////////
// TODO: Before you create 'config.json' this app will console.log the URLs to validate logins.
// The config file should look like this.:
/*
{
    smtp: {
        user:     "DO NOT COMMIT THIS FILE WITH YOUR CREDENTIALS", 
        password: "yourpassword", 
        host:     "your smtp service host like smtp.gmail.com or smtp.sparkpostmail.com",
        port:     465,
        ssl:      true,
        from:     "example@example.com"
    }
}
*/
var config = {};
var configFileName = path.join(__dirname, '..', 'config.json');
try { 
    fs.statSync(configFileName);
    config = require(configFileName);
} catch (err) {
    console.log("Failed to load configuration: " + err);
};

module.exports = config;