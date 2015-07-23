module.exports = function() {
    var client = './src/client/';
    var clientApp = client + 'app/';
    var root = './';
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
        build: './build/',                     // choose this folder since node serves from.
        client: client,                        // expose the variable
        css: temp + 'styles.css',
        fonts: './bower_components/font-awesome/fonts/**/*.*',
        html: clientApp + '**/*.html',
        htmltemplates: clientApp + '**/*.html',
        images: client + 'images/**/*.*',
        index: client + 'index.html',
        js: [
            clientApp + '**/*.module.js',
            clientApp + '**/*.js',
            '!' + clientApp + '**/*.spec.js',  // omit test files
        ],
        // could also make array like alljs if there were multiple files to compile.
        less: client + 'styles/styles.less',
        root: root,
        server: server,
        temp: temp,

        // Optimized Filenames
        optimized: {
            app: 'app.js',
            lib: 'lib.js'
        },

        // templateCache
        templateCache: {
            file: 'templates.js',
            options: {
                module: 'app.core',
                standAlone: false, // make true if you want new module
                root: 'app/'

            }
        },
        // browserSync
        browserReloadDelay: 1000,
        /**
        *
        * Bower and NPM Locations
        *
        **/
        bower: {
            bowerJson:'./bower.json',
            directory: './bower_components/',
            ignorePath: '../..'
        },
        packages :[
            './package.json',
            './bower.json'
        ],
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
