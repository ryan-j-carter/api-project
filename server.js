//
// # API Project
//
// Collection of microservices reachable through an api
//
var express = require('express');
var path = require('path');
var crypto = require('crypto');
var request = require('request');
var multer = require('multer');

var api = express();

api.use(express.static(path.resolve(__dirname, 'client')));

//why...
api.set('views', path.join(__dirname, 'client'));
api.engine('html', require('ejs').renderFile);
api.set('view engine', 'html');

//Home page listing features of the API with examples
api.get("/", function(req, res) {
    res.setHeader('content-type', 'text/html');
    res.render('index');
});

//Load get-file-size
//On button click, go to result page and send data
var storage = multer.memoryStorage();
var upload = multer({storage:storage, limits:{files:1}}).single('file');

api.get("/get-file-size", function(req, res) {
  res.setHeader('content-type', 'text/html');
  res.render('get-file-size');
});

api.post("/api/file-size", function(req, res) {
  upload(req, res, function(err) {
    if (err) throw err;
    
    if(req.file != undefined) {
      res.send({"size": req.file.size});
    }
    else {
      res.send('No file selected');
    }
  });
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

//Take a URL as a parameter and give it a 'shortened' redirect code
//Return an object with the shortened url and where it will redirect
var redirects = {};
api.get("/api/shorten/*", function(req, res) {
  res.setHeader('content-type', 'text/plaintext');
  
  var h = crypto.createHash('md5')
          .update(req.params[0])
          .digest('hex')
          .substr(0, 4);
  
  if (redirects[h] == undefined) redirects[h] = req.params[0];
  
  res.send(JSON.stringify({
    original_url: req.params[0],
    short_url: "http://" + req.headers.host.split(':')[0] + "/" + h
  }));
});

api.get("/:id", function(req, res) {
  if (redirects[req.params.id] == undefined) {
   res.setHeader('content-type', 'text/plaintext');
   res.send('URL Shortcut Not Found');
  }
  else {
    res.redirect(redirects[req.params.id]);
  }
});

//Take an image search query and return the list of results
//Also keep track of recent queries that can be retrieved at any time
var apikey = 'AIzaSyAJXV1T4DRFu-lrM0IByU8-U8RHBVLZ3bg';
var cxkey = '010794592543521060790%3Apcpguu-4xne';

var recentSearches = [];

function addSearch(search) {
  recentSearches.unshift(search);
  if (recentSearches.length > 10) {
    recentSearches.pop();
  }
}

api.get("/api/imagesearch/recent", function(req, res) {
  res.send(JSON.stringify(recentSearches));
});

api.get("/api/imagesearch/:str", function(req, res) {
  res.setHeader('content-type', 'text/plaintext');
  
  var url = 'https://www.googleapis.com/customsearch/v1?q=' + req.params.str + '&cx=' + cxkey + '&searchType=image&key=' + apikey;
  
  //If user gives an offset index, add &start=offset to the url
  if (req.query.offset != undefined) {
    url += '&start=' + req.query.offset;
  }
  
  request.get(url, function(err, data) {
    if (err) throw err;
    
    data = JSON.parse(data.body);
    
    if (data.items != undefined) {
      var images = [];
      
      data.items.forEach(function(item) {
        images.push({
          url: item.link,
          snippet: item.snippet,
          thumbnail: item.image.thumbnailLink,
          context: item.image.contextLink,
          alt: item.title
        });
      });
    
      addSearch({term: req.params.str, when: (new Date()).toISOString()});
      
      res.send(JSON.stringify(images));
    }
    else {
      res.send(data);
    }
    //data.body contains additional information, including options for the api call
  });
  
});

//Listen on the provided IP:port or the default 0.0.0.0:8080
var port = process.env.PORT || 8080;
var addr = process.env.IP || "0.0.0.0";
api.listen(port, addr, function(){
  console.log("API server listening at", addr + ":" + port);
});
