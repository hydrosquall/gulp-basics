module.exports = function() {
    var client = './src/client/';
    var clientApp = client + 'app/';
    var report = './report/';
    var root = './';
    var server = './src/server/';
    var specRunnerFile = 'specs.html';
    var temp = './.tmp/';          // Note it will create this folder for you!;
    var wiredep = require('wiredep');
    var bowerFiles = wiredep({devDependencies: true})['js'];

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
        report: report,
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
         * specs.html, our HTML spec runner
         */
        specRunner: client + specRunnerFile,
        specRunnerFile: specRunnerFile,
        testlibraries: [
            'node_modules/mocha/mocha.js',
            'node_modules/chai/chai.js',
            'node_modules/mocha-clean/index.js',
            'node_modules/sinon-chai/lib/sinon-chai.js'
        ],
        specs: [clientApp + '**/*.spec.js'],

        /**
         * Karma and Testing Settings
         */
        specHelpers: [client + 'test-helpers/*.js'],
        serverIntegrationSpecs: [client + 'tests/server-integration/**/*.spec.js'],

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

    config.karma = getKarmaOptions();
    return config;
    ///////////////
    function getKarmaOptions() {
        var options = {
            files: [].concat(
                    bowerFiles,
                    config.specHelpers,
                    client + '**/*.module.js',
                    client + '**/*.js',
                    temp + config.templateCache.file,
                    config.serverIntegrationSpecs
                ),
            exclude: [],
            coverage: {
                dir: report + 'coverage',
                reporters: [
                    {type: 'html', subdir: 'report-html'},
                    {type: 'lcov', subdir: 'report-lcov'},
                    {type: 'text-summary'}
                ]
            },
            preprocessors: {}
        };

        options.preprocessors[clientApp + '**/!(*.spec)+(.js)'] = ['coverage'];
        return options;
    }
};
