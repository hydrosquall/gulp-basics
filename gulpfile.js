var gulp = require('gulp');
var args = require('yargs').argv;         // get all arguments
var config = require('./gulp.config')();  // need to invoke to use object. JS out.
var del = require('del');                 // is a node module, no filestream needed
// Convention: strips out the "gulp" prefix. Lazy only pulls plugin when needed
var $ = require('gulp-load-plugins')({lazy: true});
var port = process.env.PORT || config.defaultPort;

// npm install --save-dev yargs gulp-load-plugins gulp-if gulp-print jshint gulp-util

gulp.task('hello-world', function() {
    console.log('Our first hellow world gulp task!');
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

gulp.task('styles', ['clean-styles'], function() { // second argument is dependencies
    log('Compiling Less--> CSS');

    return gulp
        .src(config.less) // !!! ADD CONFIG and TEMP (src and destination)
        .pipe($.plumber())
        .pipe($.less())
        // .on('error',errorLogger)
        .pipe($.autoprefixer({browsers: ['last 2 version' , '> 5%']})) // override defaults, browser marketshare
        .pipe(gulp.dest(config.temp));
});

gulp.task('clean-styles', function(done) {  // add callback to prevent things from finishing out of order
    var files = config.temp + '**/*.css';
    clean(files, done);
});

gulp.task('less-watcher', function() {
    gulp.watch([config.less], ['styles']); // files to watch, functions to run
});

gulp.task('wiredep', function() {
    log('wire up the bower css js and our app js into the html');
    var options = config.getWiredepDefaultOptions(); //TODO
    var wiredep = require('wiredep').stream;         // Note you need it as a stream!

    return gulp
    .src(config.index)
    .pipe(wiredep(options))                // Looks at bower.json and installs dependencies (jquery,bootstrap, etc)
    .pipe($.inject(gulp.src(config.js)))   // Find all files that match config.js and inject them into index
    .pipe(gulp.dest(config.client));       // TODO
});

// A SUPER function that does wiredep AND styles recompilation
// Wiredep and Styles run in parallel before the rest runs
gulp.task('inject', ['wiredep', 'styles'], function() {
    log('Wire up the APP css into the html, and call wiredep');

    return gulp
    .src(config.index)
    .pipe($.inject(gulp.src(config.css)))   // Find all files that match config css and inject them
    .pipe(gulp.dest(config.client));// TODO
});

gulp.task('serve-dev', ['inject'], function() {
    var isDev = true;

    var nodeOptions = {
        script: config.nodeServer,   // TODO app.js
        delayTime: 0.5,
        env: {                                  // Find this in top of app.js
            'PORT': port,
            'NODE_ENV': isDev ? 'dev' : 'build'
        },
        watch: [config.server]  // TODO define files to restart on
    };

    return $.nodemon(nodeOptions)   // Showing off some event handlers. Optional fn's to advance run in middle
        .on('restart', ['vet'],function(ev) {
            log('*** nodemon restarted');
            log('Files changed on restart \n' + ev);
        })
        .on('start', function() {
            log('*** nodemon started');
        })
        .on('crash', function() {
            log('*** nodemon crashed: script crashed for some reason');
        })
        .on('exit', function() {
            log('*** nodemon exited cleanly');
        });
});

/* Custom Functions */
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
/* Notes from before gulp-load-plugins was used */
// var jshint = require('gulp-jshint');    // Enforcing a styleguide
// var jscs = require('gulp-jscs');
// var util = require('gulp-util');        // Helper function for console logs
// var gulpprint = require('gulp-print');  // Print all files touched
// var gulpif = require('gulp-if');        // Conditional - will only run if you type vet --verbose
