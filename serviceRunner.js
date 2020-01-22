const bonjour = require('bonjour')();
const uuidv1 = require('uuid/v1');
const childProcess = require('child_process');
const getPort = require('get-port');
const express = require('express');
const app = express();

const appName = `test`;
const serviceName = `user`;
const servicePath = './service.js';

let runningServices = [];

const startNewService = (path, callback) => {
    let called = false;
    let process = childProcess.fork(path);
    runningServices.push({
        name: uuidv1(),
        p: process
    });

    process.on('error', (err) => {
        if (called) return;
        called = true;
        callback(err);
    })

    process.on('exit', (code) => {
        if (called) return;
        called = true;
        callback(code);
    })
}

app.disable('etag');
app.use(express.json());

app.get('/start', function(req,res) {
    startNewService(servicePath, (err) => {
        console.log(err);
    })
    return res.json("Running");
});

app.get('/stop/:serviceId', function(req,res) {
    // stop service logic
    let i = 0;
    for (i = 0; i < runningServices.length; i++) {
        if (runningServices[i].name === req.params.serviceId) {
            runningServices[i].p.kill('SIGINT');
            break;

        }
    }
    runningServices.splice(i, 1)
    return res.json("Stopping");
});

app.get('/get', function(req,res) {
    return res.json(runningServices);
});

getPort().then(port => {
    app.listen(port, () => {
        console.log(`service runner for ${serviceName} is running on ${port}`);
        bonjour.publish({ name: uuidv1(), type: 'http', port, txt: {server: appName, service: serviceName, type: 'runner'}});
    });
}).catch(e => console.log(e));


// graceful shutdown
process.on('SIGINT', () => {
    console.log(`Stopping Runner`)
    bonjour.unpublishAll(() => {
        bonjour.destroy();
        process.exit();
    })
});