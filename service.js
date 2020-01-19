const bonjour = require('bonjour')();
const express = require('express');
const app = express();

const port = 3001;
const appName = `test`
const serviceName = `user`


// this url will list all the routes
app.get('/api', function(req,res) {
    return res.json(app._router.stack
        .filter(e => e.route)
        .map(e => ({
            route: e.route.path,
            method: Object.keys(e.route.methods)
        }))
        .filter(e => {
            // hide the default routes
            return e.route !== '/api' && e.route !== '*'
        })
        );
});

app.get('/test', function(req,res) {
    return res.json({"res": "HELLO"});
});

app.get('/hello', function(req,res) {
    return res.json({"res": "HELLO"});
});
app.post('/hello', function(req,res) {
    return res.json({"res": "HELLO"});
});

app.get('*', function(req,res) {
    return res.json("Invalid URL");
});

app.listen(port, () => {
    console.log('service is running');
    bonjour.publish({ name: serviceName, type: 'http', port, txt: {server: appName, service: serviceName}});
});

// graceful shutdown
process.on('SIGINT', (code) => {
    bonjour.unpublishAll(() => {
        bonjour.destroy();
        process.exit();
    })
});