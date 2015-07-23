var gulp = require('gulp');
var args = require('yargs').argv;         // get all arguments
var browserSync = require('browser-sync');
var config = require('./gulp.config')();  // need to invoke to use object. JS out.
var del = require('del');                 // is a node module, no filestream needed
var path = require('path');               // Native to node for path joining
var _ = require('lodash');// For notifier: array manipulation and object settings
// Convention: strips out the "gulp" prefix. Lazy only pulls plugin when needed
var $ = require('gulp-load-plugins')({lazy: true});
var port = process.env.PORT || config.defaultPort;

// npm install --save-dev yargs gulp-load-plugins gulp-if gulp-print jshint gulp-util
/*
Rendered obsolete by Gulp 4 : Gulp --tasks
gulp.task('help', $.taskListing);
gulp.task('default', ['help']);
*/

gulp.task('clean', function(done) {
    var delconfig = [].concat(config.build, config.temp); // concat takes strings OR arrays- merges all, beat push
    log('Cleaning: ' + $.util.colors.blue(delconfig));
    del(delconfig, done);
});

// It's useful to design individual tasks so they can be called efficiently
gulp.task('clean-fonts', function(done) {  // add callback to prevent things from finishing out of order
    clean(config.build + 'fonts/**/*.*', done);
});

gulp.task('clean-images', function(done) {  // add callback to prevent things from finishing out of order
    clean(config.build + 'images/**/*.*', done);
});

gulp.task('clean-code', function(done) {
    var files = [].concat(
        config.temp + '**/*.js',
        config.build + '**/*.html',
        config.build + 'js/**/*.js'
    );
    clean(files, done);
});

gulp.task('clean-styles', function(done) {  // add callback to prevent things from finishing out of order
    clean(config.temp + '**/*.css', done);
});

gulp.task('vet', function() {
    log('Analyzing source with JSHint and JSCS');

    return gulp
        .src(config.alljs)
        .pipe($.if(args.verbose, $.print()))
        .pipe($.jscs())
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish', {verbose: true}))
        .pipe($.jshint.reporter('fail'));
});

//gulp.task('templatecache', ['clean-code'], function () {
gulp.task('templatecache', gulp.series('clean-code', function () {
    log('Creating AngularJS $templateCache');

    return gulp
        .src(config.htmltemplates)
        // Let empty HTMl tags stay
        .pipe($.minifyHtml({empty: true}))
        .pipe($.angularTemplatecache(
            config.templateCache.file,
            config.templateCache.options))
        .pipe(gulp.dest(config.temp));

}));

// gulp.task('test', ['vet', 'templatecache'], function(done) {
gulp.task('test', gulp.series(
    gulp.parallel('vet', 'templatecache'),
    function(done) {
    startTests(true /* singleRun */, done);
}));

// gulp.task('autotest', ['vet', 'templatecache'], function(done) {
gulp.task('autotest', gulp.series(
    gulp.parallel('vet', 'templatecache'),
    function(done) {
    startTests(false /* singleRun */, done);
}));

//gulp.task('styles', ['clean-styles'], function() { // second argument is dependencies. Gulp 3 mode
gulp.task('styles', gulp.series('clean-styles', function() {
    log('Compiling Less--> CSS');
    return gulp
        .src(config.less) // !!! ADD CONFIG and TEMP (src and destination)
        .pipe($.plumber())
        .pipe($.less())
        // .on('error',errorLogger)
        .pipe($.autoprefixer({browsers: ['last 2 version' , '> 5%']})) // override defaults, browser marketshare
        .pipe(gulp.dest(config.temp));
}));

// gulp.task('fonts', ['clean-fonts'], function() {
gulp.task('fonts', gulp.series('clean-fonts', function() {
    log('Copying fonts');
    return gulp.src(config.fonts)
        .pipe(gulp.dest(config.build + 'fonts'));
}));

//gulp.task('images', ['clean-images'], function() {
gulp.task('images', gulp.series('clean-images', function() {
    log('Copying and compressing the images');
    return gulp.src(config.images)
        .pipe($.imagemin({optimizationLevel: 4}))   // default is 3
        .pipe(gulp.dest(config.build + 'images'));

}));

gulp.task('less-watcher', function() {
    gulp.watch([config.less], ['styles']); // files to watch, functions to run
});

gulp.task('wiredep', function() {
    log('wire up the bower css js and our app js into the html');
    var options = config.getWiredepDefaultOptions(); //TODO
    var wiredep = require('wiredep').stream;         // Note you need it as a stream!

    return gulp
    .src(config.index)
    .pipe(wiredep(options))// Looks at bower.json and installs dependencies (jquery,bootstrap, etc)
    .pipe($.inject(gulp.src(config.js)))// Find all files that match config.js and inject them into index
    .pipe(gulp.dest(config.client));
});

// A SUPER function that does wiredep AND styles recompilation
// Wiredep and Styles run in parallel before the rest runs
// gulp.task('inject', ['wiredep', 'styles', 'templatecache'], function() {
gulp.task('inject', gulp.series(
    gulp.parallel('wiredep', 'styles', 'templatecache'),
    function() {
        log('Wire up the APP css into the html, and call wiredep');

        return gulp
            .src(config.index)
            .pipe($.inject(gulp.src(config.css)))   // Find all files that match config css and inject them
            .pipe(gulp.dest(config.client));// TODO
    })
);

// gulp.task('optimize', ['inject', 'test'], function() {
gulp.task('optimize', gulp.series(
    gulp.parallel('inject', 'test'),
    function() {
        log('Optimizing the javascript, css, html');

        var assets = $.useref.assets({searchPath: './'});
        var templateCache = config.temp + config.templateCache.file;
        var cssFilter = $.filter('**/*.css');
        var jsLibFilter = $.filter('**/' + config.optimized.lib);
        var jsAppFilter = $.filter('**/' + config.optimized.app);

        return gulp
            .src(config.index)
            .pipe($.plumber())
            .pipe($.inject(gulp.src(templateCache, {read:false}), {
                starttag: '<!-- inject:templates:js -->'
            }))
            .pipe(assets)               // concatenate everything in the build:js tags
            .pipe(cssFilter)            // filter down to css
            .pipe($.csso())             // csso
            .pipe(cssFilter.restore())  // css filter restore

            .pipe(jsLibFilter)           // filter down lib js
            .pipe($.uglify())            // uglify
            .pipe(jsLibFilter.restore()) // js filter restore

            .pipe(jsAppFilter)           //  js filter restore
            .pipe($.ngAnnotate())        // for annotating our angular stuff with injection help
            .pipe($.uglify())            // uglify
            .pipe(jsAppFilter.restore()) //  js filter restore
            // cache busting
            .pipe($.rev())              // app.js -? ap-2390asdf.js
            .pipe(assets.restore())     // get index.html back
            .pipe($.useref())           // cut links down to one link for each bunch
            .pipe($.revReplace())       // edit filelinks
            .pipe(gulp.dest(config.build))
            .pipe($.rev.manifest())
            .pipe(gulp.dest(config.build));
    })
);

//gulp.task('build', ['optimize', 'images', 'fonts'], function() {
gulp.task('build', gulp.series(
    gulp.parallel('optimize', 'images', 'fonts'),
    function(done) {
        log('Building everything');

        var msg = {
            title: 'gulp build',
            subtitle: 'Deployed to the build folder',
            message: 'Running `gulp serve-build`'
        };
        del(config.temp);
        log(msg);
        notify(msg);
        done();
    })
);

// gulp.task('build-specs', ['templatecache'], function() {
gulp.task('build-specs', gulp.series('templatecache', function() {
    log('building the spec runner');

    var wiredep = require('wiredep').stream;
    var options = config.getWiredepDefaultOptions();
    var specs = config.specs;

    options.devDependencies = true; // make exception and inject dev dependencies too

    if (args.startServers) {        // Bonus server tests
        specs = [].concat(specs, config.serverIntegrationSpecs);
    }

    return gulp
        .src(config.specRunner)
        .pipe(wiredep(options))     // These are handling the injections on the blank specs.html. Wiredep handles bower.
        .pipe($.inject(gulp.src(config.testlibraries),   // Param1 is source, param 2 is inject location
                {name: 'inject:testlibraries', read: false}))
        .pipe($.inject(gulp.src(config.js)))           // Default injections to inject:js
        .pipe($.inject(gulp.src(config.specHelpers),   // Injection to specHelpers
                {name: 'inject:specHelpers', read: false}))
        .pipe($.inject(gulp.src(specs),         // Injections to specs
                {name: 'inject:specs', read: false}))
        .pipe($.inject(gulp.src(config.temp + config.templateCache.file),   // Inject templates
                {name: 'inject:templates', read: false}))
        .pipe(gulp.dest(config.client));

}));

// gulp.task('serve-specs', ['build-specs'], function(done) {
gulp.task('serve-specs', gulp.series('build-specs', function(done) {
    log('run the spec runner');
    serve(true /* isDev */, true /*specRunner */);
    done();
}));

// Take advantage of gulp 4's new apis
gulp.task('build-gulp-four',
    gulp.series(
        gulp.parallel('vet', 'test'),
        gulp.parallel('wiredep', 'styles', 'templatecache'),
        'optimize'
        )
    );

/**
 *  Bump the version
 * --type=pre will bump the prerelease version *.*.*-x
 * --type=patch or no flag will bump the patch version *.*.x
 * --type=minor will bump the minor version *.x.*
 * --type=major will bump the major version x.*.*
 * --type=version:1.2.3 will bump to a specific version and ignore other flags
 */
gulp.task('bump', function() {
    var msg = 'Bumping versions';
    var type = args.type;
    var version = args.version;
    var options = {};
    if (version) {
        options.version = version;
        msg += ' to ' + version;
    } else {
        options.type = type;
        msg += ' for a ' + type;
    }
    log(msg);

    return gulp
     .src(config.packages)
     .pipe($.bump(options))
     .pipe($.print())     // See name of file being worked on
     .pipe(gulp.dest(config.root));
});

// gulp.task('serve-build', ['build'], function() {
gulp.task('serve-build', gulp.series('build', function() {
    serve(false /*isDev*/);
}));

// gulp.task('serve-dev', ['inject'], function() {
gulp.task('serve-dev', gulp.series('inject', function() {
    serve(true /*isDev*/);
}));

gulp.task('hello-world', function() {
    console.log('Our first hellow world gulp task!');
});

/**================
 * Custom Functions
 =================*/
function serve(isDev, specRunner) {
    var nodeOptions = {
        script: config.nodeServer,
        delayTime: 0.5,
        env: {                // Find this in top of app.js
            'PORT': port,
            'NODE_ENV': isDev ? 'dev' : 'build'
        },
        watch: [config.server] // define files to restart on
    };

    return $.nodemon(nodeOptions)   // Showing off some event handlers. Optional fn's to advance run in middle
        .on('restart', ['vet'], function(ev) {
            log('*** nodemon restarted');
            log('Files changed on restart \n' + ev);
            setTimeout(function() {
                browserSync.notify('reloading now...');
                browserSync.reload({stream:false});
            }, config.browserReloadDelay);
        })
        .on('start', function() {
            log('*** nodemon started');
            startBrowserSync(isDev, specRunner);
        })
        .on('crash', function() {
            log('*** nodemon crashed: script crashed for some reason');
        })
        .on('exit', function() {
            log('*** nodemon exited cleanly');
        });
}

function clean(path, done) {
    log('We are cleaning:' + $.util.colors.blue(path));
    del(path, done);
}

function log(msg) {
    if (typeof(msg) === 'object') {
        for (var item in msg) {
            if (msg.hasOwnProperty(item)) {
                $.util.log($.util.colors.blue(msg[item]));
            }
        }
    } else {
        $.util.log($.util.colors.blue(msg));
    }
}

function errorLogger(error) {
    log('*** Start of Error ***');
    log(error);
    log('*** End of Error ***');
    this.emit('end');
}

function helloWorld() {
    log('*** Start of World ***');
}

function changeEvent(event) {
    var srcPattern = new RegExp('/.*(?=/' + config.source + ')/');
    log('File ' + event.path.replace(srcPattern, '') + ' ' + event.type);
}

function notify(options) {
    var notifier = require('node-notifier');
    var notifyOptions = {
        sound: 'Bottle',
        contentImage: path.join(__dirname, 'gulp.png'),
        icon: path.join(__dirname, 'gulp.png')
    };
    _.assign(notifyOptions, options);// merge objects
    notifier.notify(notifyOptions);
}
function startBrowserSync(isDev, specRunner) {
    if (browserSync.active) {
        return;
    }
    log('Starting browser-sync on port ' + port);
    if (isDev) {
        gulp.watch([config.less], ['styles'])
            .on('change', function(event) { changeEvent(event);  });
    } else {
        gulp.watch([config.less, config.js, config.html], ['optimize', browserSync.reload])
            .on('change', function(event) { changeEvent(event);  });
    }
    var options = {
        proxy: 'localhost:' + port,
        port: 3000,
        files: isDev ? [
            config.client + '**/*.*',
            '!' + config.less,
            config.temp + '**/*.css'
        ] : [],// Need to reload a different way so reoptimize happens before reload
        ghostMode: {
            clicks: true,
            location: false,
            forms: true,
            scroll: true
        },
        injectChanges: true,
        logFileChanges: true,
        logLevel: 'debug',
        logPrefix: 'gulp-patterns',
        notify: true,
        reloadDelay:  0//1000
    };

    if (specRunner) {
        options.startPath = config.specRunnerFile; // don't use index.html, use specfile
    }

    browserSync(options);
}

function startTests(singleRun, done) {
    var child;
    var fork = require('child_process').fork;
    var karma = require('karma').server;
    var excludeFiles = [];
    var serverSpecs = config.serverIntegrationSpecs;

    if (args.startServers) {
        log('Starting Server');
        var savedEnv = process.env;
        savedEnv.NODE_ENV = 'dev';
        savedEnv.PORT = 8888;
        child = fork(config.nodeServer);
    } else {
        if (serverSpecs && serverSpecs.length) {
            excludeFiles = serverSpecs;
        }
    }

    karma.start({
        configFile: __dirname + '/karma.conf.js',
        exclude: excludeFiles,
        singleRun: !!singleRun // force boolean
    }, karmaCompleted);

    function karmaCompleted(karmaResult) {
        log('Karma completed');
        if (child) {
            log('Shutting down the child process');
            child.kill();
        }
        if (karmaResult === 1) {
            done('karma: tests failed with code' + karmaResult);
        } else {
            done();
        }
    }
}
/* Notes from before gulp-load-plugins was used */
// var jshint = require('gulp-jshint');    // Enforcing a styleguide
// var jscs = require('gulp-jscs');
// var util = require('gulp-util');        // Helper function for console logs
// var gulpprint = require('gulp-print');  // Print all files touched
// var gulpif = require('gulp-if');        // Conditional - will only run if you type vet --verbose
