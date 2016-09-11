//
// # API Project
//
// Collection of microservices reachable through an api
//
var express = require('express');
var path = require('path');

var api = express();

api.use(express.static(path.resolve(__dirname, 'client')));

//Home page listing features of the API with examples
api.get("/", function(req, res) {
    res.setHeader('content-type', 'text/html');
    res.render('index');
});

//Take a timestamp or natural date and return object with both versions.
//If the request is bad, both dates are returned as null
var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

api.get("/api/ts/:date", function(req, res) {
    res.setHeader('content-type', 'text/plaintext');
    
    var dates = { unix:null, natural:null };
    
    //Attempt to parse the request as a timestamp or natural date
    var date;
    if (!isNaN(req.params.date)) {
      date = new Date(+req.params.date * 1000);
    }
    else {
      date = new Date(req.params.date);
    }
    
    //If the date is valid, update the dates object
    if (!isNaN(date)) {
      dates.unix = date.getTime() / 1000;
      dates.natural = months[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
    }
    
    //Return dates regardless of success or failure
    res.send(JSON.stringify(dates));
});

//Return the IP, language, and device info of the machine making the request
api.get("/api/whoami", function(req, res) {
    res.setHeader('content-type', 'text/plaintext');
    
    var headers = {
      ipaddress: req.headers['x-forwarded-for'],
      language: req.headers['accept-language'].split(',')[0],
      software: req.headers['user-agent'].split('(')[1].split(')')[0]
    };
    
    res.send(JSON.stringify(headers));
});

var port = process.env.PORT || 8080;
var addr = process.env.IP || "0.0.0.0";
api.listen(port, addr, function(){
  console.log("API server listening at", addr + ":" + port);
});
