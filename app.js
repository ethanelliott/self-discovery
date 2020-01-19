const bonjour = require('bonjour')();
const net = require('net');
const axios = require('axios');
const express = require('express');
const app = express();

let appName = `test`;

let knownRoutes = {};

const serviceName = (name) => `microservice-${appName}-${name}`;

// browse for all http services
let b = bonjour.find({ type: `http` });

b.on("up", (service) => {
    // find only the services for the current app
    if (service.txt && service.txt.server && service.txt.server === appName) {
        let name = service.txt.service;
        let address = service.addresses.filter(e => net.isIPv4(e))[0];
        console.log(`REGISTER: ${name} -> ${address}:${service.port}`);
        axios.get(`http://${address}:${service.port}/api`).then(res => {
            knownRoutes[name] = {name: name, address: address, port: service.port, routes: res.data}
        }).catch(err => {
            console.log(err);
        });
    }
})

b.on("down", (service) => {
    // clean up service when it gets destroyed
    if (service.txt && service.txt.server && service.txt.server === appName) {
        let name = service.txt.service;
        delete knownRoutes[name];
        console.log(`REMOVE: ${name}`);
    }
})

const handleRequest = async (req, res) => {
    let url = req.url.substr(1).split('/');
    if (url[0] === 'api') {
        url.shift();
        if (knownRoutes[url[0]]) {
            let service = knownRoutes[url[0]];
            url.shift();
            let servicePath = `/${url.join('/')}`;
            let testRoute = service.routes.filter(e => servicePath === e.route)[0]; 
            // need a better way to ensure the route exists!
            // also need to figure out what params will be forwarded from the initial req
            let reqUrl = `http://${service.address}:${service.port}${servicePath}`;
            let re = await axios({
                method: req.method.toLowerCase(),
                url: reqUrl
            });
            return res.json(re.data);
        } else {
            return res.json(Object.keys(knownRoutes).map(e => {
                return {
                    name: knownRoutes[e].name,
                    routes: knownRoutes[e].routes
                }
            })); // this won't be here in prod
        }
    } else {
        return res.json({"err": "Something went wrong"});
    }
}

app.get('*', handleRequest);
app.post('*', handleRequest);

app.listen(5000);
