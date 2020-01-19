const bonjour = require('bonjour')();
const express = require('express');
const app = express();

const port = 3001;


// this url will list all the routes
app.get('/api', function(req,res) {
    return res.json([
        // this data will come from the ts metadata reflection for building the swagger pages
        {name: 'test', path: '/test'}
    ]);
});

app.get('/test', function(req,res) {
    return res.json({"res": "HELLO"});
});

app.get('*', function(req,res) {
    return res.json("Invalid URL");
});

app.listen(port, () => {
    console.log('service is running');
    bonjour.publish({ name: 'microservice-ontechcourse-user', type: 'http', port });
});
