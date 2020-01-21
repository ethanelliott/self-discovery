const bonjour = require('bonjour')();
const net = require('net');
const schedule = require('node-schedule');
const axios = require('axios');
const express = require('express');
const app = express();

const port = 5000
const appName = `test`;

let knownRoutes = {};

const newService = (service) => {
    // find only the services for the current app
    if (service.txt && service.txt.server && service.txt.server === appName) {
        let name = service.txt.service;
        let address = service.addresses.filter(e => net.isIPv4(e))[0];
        console.log(`REGISTER: ${name} -> ${address}:${service.port} [${service.name}]`);
        let job = schedule.scheduleJob(`*/5 * * * * *`, async (time) => {
            try {
                let r = await axios.get(`http://${address}:${service.port}/heartbeat`);
            } catch (e) {
                // an error has occured
                cleanUpService(service);
            }
        })
        axios.get(`http://${address}:${service.port}/api`).then(res => {
            if (knownRoutes[name]) {
                knownRoutes[name].nodes.push({
                    name: service.name,
                    address: address,
                    port: service.port,
                    heartBeat: job
                });
            } else {
                knownRoutes[name] = {
                    name: name,
                    nodes: [{ name: service.name, address: address, port: service.port, heartBeat: job }],
                    lastUsedNode: 0,
                    routes: res.data
                };
            }
        }).catch(err => {
            console.log(err);
        });
    }
}

const cleanUpService = (service) => {
    // clean up service when it gets destroyed
    if (service.txt && service.txt.server && service.txt.server === appName) {
        let name = service.txt.service;
        let nodeName = service.name;
        for (let i = 0; i < knownRoutes[name].nodes.length; i++) {
            knownRoutes[name].nodes[i].heartBeat.cancel();
        }
        if (knownRoutes[name].nodes.length > 1) {
            knownRoutes[name].nodes = knownRoutes[name].nodes.filter(e => e.name !== nodeName);
        } else {
            delete knownRoutes[name];
        }
        console.log(`REMOVE: ${name} [${nodeName}]`);
    }
}

const handleRequest = async (req, res) => {
    let url = req.url.substr(1).split('?')[0].split('/');
    if (url[0] === 'api') {
        url.shift();
        if (knownRoutes[url[0]]) {
            let service = knownRoutes[url[0]];
            // round-robin node selection
            if (service.lastUsedNode < (service.nodes.length - 1)) {
                service.lastUsedNode += 1;
            } else {
                service.lastUsedNode = 0;
            }
            let node = service.nodes[service.lastUsedNode];
            url.shift();
            let servicePath = `/${url.join('/')}`;
            let testRoute = service.routes.filter(e => servicePath === e.route)[0];
            // need a better way to ensure the route exists!
            // also need to figure out what params will be forwarded from the initial req
            console.log(`${req.method} [${service.name}] ${servicePath} [${node.name}]`);
            let reqUrl = `http://${node.address}:${node.port}${servicePath}`;
            try {
                let re = await axios({
                    method: req.method.toLowerCase(),
                    url: reqUrl,
                    params: req.query,
                    headers: req.headers,
                    data: req.body
                });
                return res.json(re.data);
            } catch (e) {
                return res.json(e);
            }

        } else {
            return res.json(knownRoutes);
        }
    } else {
        return res.json({ "err": "Something went wrong" });
    }
}

// browse for all http services
let b = bonjour.find({ type: `http` });
b.on("up", newService);
b.on("down", cleanUpService);

app.use(express.json());
app.get('*', handleRequest);
app.post('*', handleRequest);

app.listen(port);
