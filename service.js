const bonjour = require('bonjour')();

bonjour.publish({ name: 'microservice-ontechcourse-user', type: 'http', port: 3001 });

