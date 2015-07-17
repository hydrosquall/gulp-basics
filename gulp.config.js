module.exports = function() {
    var client = './src/client/';
    var clientApp = client + 'app/';
    var server = './src/server/';
    var temp = './.tmp/';          // Note it will create this folder for you!;

    var config = {
        /*
            FILEPATHS                                // all the JS to vet
         */
        alljs: [
            './src/**/*.js',
            './*.js'
        ],
        client: client,                        // expose the variable
        css: temp + 'styles.css',
        index: client + 'index.html',
        js: [
            clientApp + '**/*.module.js',
            clientApp + '**/*.js',
            '!' + clientApp + '**/*.spec.js',  // omit test files
        ],
        // could also make array like alljs if there were multiple files to compile.
        less: client + 'styles/styles.less',
        server: server,
        temp: temp,
        /**
        *
        * Bower and NPM Locations
        *
        **/
        bower:{
            bowerJson:'./bower.json',
            directory: './bower_components/',
            ignorePath: '../..'
        },

        /**
        *
        * Node Settings
        *
        **/
        defaultPort: 7203,
        nodeServer: server + 'app.js',

    };

    config.getWiredepDefaultOptions = function() {
        var options = {
            bowerJson: config.bower.json,
            directory: config.bower.directory,
            ignorePath: config.bower.ignorePath
        };
        return options;
    };
    return config;
};
