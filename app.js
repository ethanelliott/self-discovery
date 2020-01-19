const bonjour = require('bonjour')();
const net = require('net');
var express = require('express');
var app = express();

let knownRoutes = {};

// browse for all http services
bonjour.find({ name: 'microservice' }, function (service) {
    if (service.name.includes('microservice-ontechcourse-')) {
        let name = service.name.split('microservice-ontechcourse-')[1];
        let address = service.addresses.filter(e => net.isIPv4(e))[0];
        console.log(`${name} -> ${address}:${service.port}`);
        // need to get the available paths from the service
        knownRoutes[name] = {
            name: name,
            address: address,
            port: service.port
        }
    }
});

app.get('*', function(req,res) {
    let url = req.url.split('/');
    url.shift(); // remove first null item
    console.log(url);
    if (url[0] === 'api') {
        if (knownRoutes[url[1]]) {
            let service = knownRoutes[url[1]];
            console.log(service);
            return res.json(service);
        }
        return res.json(knownRoutes);
    } else {
        return res.json({});
    }
});

// app.get('/api', function(req,res) {
//     return res.json(knownRoutes);
// });
//
// app.get('/api/:service', function(req,res) {
//     console.log(req.params.service);
//     if (knownRoutes[req.params.service]) {
//         let service = knownRoutes[req.params.service];
//         console.log(service);
//         return res.json(service);
//     }
//     return res.json({})
// });

app.listen(5000);
