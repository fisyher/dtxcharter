//Starting point for node server
var express = require('express');
var app = express();
var path = require('path');

// Define the port to run on
app.set('port', 12000);

// Add middleware to console log every request
/*app.use(function(req, res, next) {
  console.log(req.method, req.url);
  next(); 
});*/

// Set static directory before defining routes
app.use(express.static(path.join(__dirname, 'public')));

//Error handling middleware last
app.use(function(err, req, res, next){
    console.error(err.stack);
    //TODO: Handle various errors here correctly
    res.status(400).json({
        message: 'Bad request. Something went wrong'
    });
});

// Listen for requests
var server = app.listen(app.get('port'), function() {
  var port = server.address().port;
  console.log('Server listening on port ' + port);
});
