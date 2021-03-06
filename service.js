const bonjour = require('bonjour')();
const uuidv1 = require('uuid/v1');
const getPort = require('get-port');
const express = require('express');
const app = express();

const appName = `test`
const serviceName = `user`

app.disable('etag');
app.use(express.json());
// this url will list all the routes
app.get('/api', function(req,res) {
    let r = app._router.stack
    .filter(e => e.route)
    .map(e => ({
        route: e.route.path,
        method: Object.keys(e.route.methods)
    }))
    .filter(e => {
        // hide the default routes
        return e.route !== '/api' && e.route !== '/heartbeat' && e.route !== '*'
    });
    // need to add a way to compress the routes
    return res.json(r);
});
app.get('/heartbeat', function(req,res) {
    return res.send("alive");
});

app.get('/test', function(req,res) {
    return res.json({"res": "test"});
});

app.get('/hello', function(req,res) {
    return res.json({"res": `HELLO ${req.query.name}`});
});
app.post('/hello', function(req,res) {
    return res.json({"res": `HELLO ${req.body.name}`});
});

// this last as a default error page 
app.get('*', function(req,res) {
    return res.json("Invalid URL");
});


getPort().then(port => {
    app.listen(port, () => {
        console.log(`service is running on ${port}`);
        bonjour.publish({ name: uuidv1(), type: 'http', port, txt: {server: appName, service: serviceName, type: 'service'}});
    });
}).catch(e => console.log(e));


// graceful shutdown
process.on('SIGINT', () => {
    console.log(`Shutting down`)
    bonjour.unpublishAll(() => {
        bonjour.destroy();
        process.exit();
    })
});