const express = require('express');
const appConfig = require('./config/appConfig');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const mongoose = require('mongoose');
const globalErrorMiddleware = require('./app/middlewares/appErrorHandler');
const routeLoggerMiddleware = require('./app/middlewares/routeLogger');
const http = require('http');
const logger = require('./app/libs/loggerLib');
const helmet = require('helmet');
const morgan = require('morgan');

//declaring an instance or creating an application instance
const app = express();

//middlewares
app.use(morgan('dev'));
app.use(helmet())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser())

app.use(routeLoggerMiddleware.logIp);
app.use(globalErrorMiddleware.globalErrorHandle);

/**  server images, CSS and JavaScript files in a directory named 'client' i.e.
 * to join client side code/static files like HTML/CSS/Js with Backend , 
 * otherwise will get CORS error
 */
app.use(express.static(path.join(__dirname, 'client')));

const routesPath = './app/routes';
const modelsPath = './app/models';
const controllersPath = './app/controllers';
const middlewaresPath = './app/middlewares';
const libsPath = './app/libs';

app.all('*', function (req, res, next) {
    res.header("Access-control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
    next();
});
// end middlewares

//reading models directory synchronously(Bootstrap models)
fs.readdirSync(modelsPath).forEach(function (file) {
    if (~file.indexOf('.js')) {
        require(modelsPath + '/' + file)
    }
});
// end bootstraping models directory



//reading route directory synchronously(Bootstrap route)
fs.readdirSync(routesPath).forEach(function (file) {
    if (~file.indexOf('.js')) {
        console.log(`Including the ${routesPath}/${file} route`)
        let route = require(routesPath + '/' + file);
        route.setRouter(app);
    }
});
// end bootstraping route directry

//calling global 404 handler after route
app.use(globalErrorMiddleware.globalNotFoundHandler);
/* Order of declaring error-level middleware is important: 
if you put globalErrorHandlerMiddleware before the actual routes are called
 then all the routes will be re-directed to this & get an error */
// end global 404 handler

/**
 * Create HTTP server.
 */

const server = http.createServer(app);
// start listening to http server
console.log(appConfig);
server.listen(appConfig.port);
server.on('error', onError);
server.on('listening', onListening);

// end server listening code

//---------------- socket io connection handler -----------------
const socketLib = require("./app/libs/socketLib");
const socketServer = socketLib.setServer(server);
// --------------- end socketio connection handler --------------


/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
    if (error.syscall !== 'listen') {
        logger.error(error.code + ' not equal listen', 'serverOnErrorHandler', 10)
        throw error;
    }

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            logger.error(error.code + ':elavated privileges required', 'serverOnErrorHandler', 10)
            process.exit(1);
            break;
        case 'EADDRINUSE':
            logger.error(error.code + ':port is already in use.', 'serverOnErrorHandler', 10)
            process.exit(1);
            break;
        default:
            logger.error(error.code + ':some unknown error occured', 'serverOnErrorHandler', 10)
            throw error;
    }
}


/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {

    var addr = server.address();
    var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    ('Listening on ' + bind);
    logger.info('server listening on port' + addr.port, 'serverOnListeningHandler', 10);
    let db = mongoose.connect(appConfig.db.uri, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false });
}

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

//-----------Mongoose Connection Handler----------

//handling mongoose connection error
mongoose.connection.on('error', function (err) {
    console.log("database connection error");
    console.log(err);
    logger.error(err,
        'mongoose connection on error handler', 10)
}); // end mongoose connection error

//handling mongoose success event
mongoose.connection.on('open', function (err) {
    if (err) {
        console.log("database error");
        console.log(err);
        logger.error(err, 'mongoose connection open handler', 10)
    } else {
        console.log("database connection open success");
        logger.info("database connection open", 'database connection open handler', 10)
    }
}); // end mongoose connection open handler
// ------- End Mongoose Connection Handler--------


module.exports = app;
