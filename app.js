const bonjour = require('bonjour')();
const net = require('net');
const axios = require('axios');
const express = require('express');
const app = express();

let appName = `ontechcourse`;

let knownRoutes = {};

const serviceName = (name) => `microservice-${appName}-${name}`;

// browse for all http services
bonjour.find({ type: `http` }, function (service) {
    if (service.name.includes(`microservice-${appName}-`)) {
        let name = service.name.split(`microservice-${appName}-`)[1];
        let address = service.addresses.filter(e => net.isIPv4(e))[0];
        console.log(`${name} -> ${address}:${service.port}`);
        // need to get the available paths from the service
        axios.get(`http://${address}:${service.port}/api`).then(res => {
            knownRoutes[name] = {
                name: name,
                address: address,
                port: service.port,
                routes: res.data
            }
        }).catch(err => {
            console.log(err);
        })
    
    }
});

const handleRequest = async (req, res) => {
    let url = req.url.split('/');
    url.shift(); // remove first null item
    if (url[0] === 'api') {
        url.shift();
        if (knownRoutes[url[0]]) {
            let service = knownRoutes[url[0]];
            url.shift();
            let servicePath = `/${url.join('/')}`;
            let testRoute = service.routes.filter(e => servicePath === e.path)[0]; 
            // need a better way to ensure the route exists!
            // also need to figure out what params will be forwarded from the initial req
            let reqUrl = `http://${service.address}:${service.port}${servicePath}`;
            let re = await axios({
                method: req.method.toLowerCase(),
                url: reqUrl
            });
            return res.json(re.data);
        } else {
            return res.json(knownRoutes);
        }
    } else {
        return res.json({"err": "Something went wrong"});
    }
}

app.get('*', handleRequest);
app.post('*', handleRequest);

app.listen(5000);
