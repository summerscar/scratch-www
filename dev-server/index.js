var express = require('express');
var proxy = require('express-http-proxy');
var webpackDevMiddleware = require('webpack-dev-middleware');
var proxyMiddleware = require('http-proxy-middleware');
var webpack = require('webpack');

var compiler = webpack(require('../webpack.config.js'));
var handler = require('./handler');
var log = require('./log');
var routes = require('../src/routes.json').concat(require('../src/routes-dev.json'))
    .filter(route => !process.env.VIEW || process.env.VIEW === route.view);

// Create server
var app = express();
app.disable('x-powered-by');

let proxyTable = {
    '/proxy': {
        target: 'https://api.scratch.mit.edu/',
        changeOrigin: true,
        secure: true,
        pathRewrite: {
            '^/proxy': '/proxy'
        },
        headers: {
            Referer: 'https://api.scratch.mit.edu/'
        }
    },
    '/session': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: true,
        pathRewrite: {
            '^/session': '/session'
        }
    },
    '/user': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: true,
        pathRewrite: {
            '^/user': '/user'
        }
    },
    '/news': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: true,
        pathRewrite: {
            '^/news': '/news'
        }
    }
};

// proxy api requests
Object.keys(proxyTable).forEach(function (context) {
    var options = proxyTable[context];
    if (typeof options === 'string') {
        options = {target: options};
    }
    app.use(proxyMiddleware(options.filter || context, options));
});

// Server setup
// app.use(log());

// Bind routes
routes.forEach(route => {
    app.get(route.pattern, handler(route));
});

var middlewareOptions = {};
if (process.env.USE_DOCKER_WATCHOPTIONS) {
    middlewareOptions = {
        watchOptions: {
            aggregateTimeout: 500,
            poll: 2500,
            ignored: ['node_modules', 'build']
        }
    };
}

app.use(webpackDevMiddleware(compiler, middlewareOptions));

var proxyHost = process.env.FALLBACK || '';
if (proxyHost !== '') {
    // Fall back to scratchr2 in development
    // This proxy middleware must come last
    app.use('/', proxy(proxyHost));
}

// Start listening
var port = process.env.PORT || 8333;
app.listen(port, function () {
    process.stdout.write('Server listening on port ' + port + '\n');
    if (proxyHost) {
        process.stdout.write('Proxy host: ' + proxyHost + '\n');
    }
});
