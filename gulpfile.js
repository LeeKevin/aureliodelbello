const path = require('path')
const gulp = require('gulp')
const inject = require('gulp-inject')
const sass = require('gulp-sass')
const cleanCSS = require('gulp-clean-css')
const concat = require('gulp-concat')
const sourcemaps = require('gulp-sourcemaps')
const autoprefixer = require('gulp-autoprefixer')
const rev = require('gulp-rev')
const prettyUrl = require('gulp-pretty-url')
const cached = require('gulp-cached')
const cache = require('gulp-memory-cache')
const uglify = require('gulp-uglify')
const gulpif = require('gulp-if')
const importCss = require('gulp-cssimport')
const source = require('vinyl-source-stream')
const buffer = require('vinyl-buffer')
const mergeStream = require('merge-stream')
const log = require('fancy-log')

const globby = require('globby')
const rimraf = require('rimraf')
const fs = require('fs')
const browserify = require('browserify')
const watchify = require('watchify')
const babel = require('babelify')
const argv = require('yargs').argv

const settings = require('./settings')

const gulpPartials = require('./build/gulp-partials')

const PARTIALS_DIR = './src/partials'
const isProduction = argv && argv.production === true
console.log('Is Production? ' + (isProduction ? 'Yes' : 'No'))

const pageTasks = {
    index: (isRefresh) => {
        return globby(['./src/images/photos/*'])
            .then((paths) => {
                const data = { images: [] }
                paths.sort().map(function map(item) {
                    data.images.push(`/${path.relative('./src', item)}`)
                })

                return data
            })
            .then((data) => {
                return generateHtmlGulpStream('index', './public', { isRefresh, data })
            })
    },
}
const pageWatcherFiles = Object.keys(pageTasks).reduce((watcher, taskName) => ({
    ...watcher, [taskName]: [
        `./src/**/${taskName}.*`,
        `./src/**/${taskName}/*`
    ]
}), {})

Object.keys(pageTasks).forEach(taskName => {
    gulp.task(taskName, () => {
        return pageTasks[taskName]()
    })
})

gulp.task('run', gulp.series(gulp.parallel(Object.keys(pageTasks))))

gulp.task('misc', function () {
    return copyMisc()
})

gulp.task('images', function () {
    return copy('./src/images/**/*', './public/images')
})

gulp.task('clean-run', function () {
    return globby([
        'public/**/*',
        '!public/.git/**/*',
        '!public/images/**/*',
        '!public/fonts/**/*'
    ])
        .then(function then(paths) {
            paths.map(function map(item) {
                rimraf.sync(item)
            })
        })
})

gulp.task('clean-images', function () {
    return globby(['public/images/**/*', '!public/.git'])
        .then(function then(paths) {
            paths.map(function map(item) {
                rimraf.sync(item)
            })
        })
})

gulp.task('clean', gulp.series(gulp.parallel('clean-run', 'clean-images')))

gulp.task('watch', gulp.series(
    function (done) {
        process.env.IS_GULP_WATCH = 'true'
        done(isProduction ? new Error('Cannot run "watch" with production flag') : null)
    },
    'clean-run',
    gulp.parallel('run', 'images', 'misc'),
    function (done) {
        function rebuildPage(name) {
            return () => pageTasks[name](true)
        }

        watchCopy('./src/images/**/*', './public/images')
        watchCopy('./src/fonts/**/*', './public/fonts')
        watchCopy('./src/root/**/*', './public')
        gulp.watch(
            [
                './src/styles/main.scss',
                './src/js/main.js',
                './src/partials/**/*',
                './src/js/_includes/*',
                './src/styles/_includes/*'
            ],
            { usePolling: true },
            gulp.parallel(...Object.keys(pageTasks).map(rebuildPage))
        )
        Object.keys(pageTasks).forEach(taskName => {
            if (taskName in pageWatcherFiles) {
                gulp.watch(pageWatcherFiles[taskName], { usePolling: true }, rebuildPage(taskName))
            }
        })
        done()
    }
))

gulp.task('build', gulp.series(
    'clean',
    gulp.parallel('misc', 'images', 'run'),
))

function generateHtmlGulpStream(name, dest, options) {
    const templateFile = `./src/templates/${name}.html`
    if (!fs.existsSync(templateFile)) {
        return null
    }

    const style = `./src/styles/${name}.scss`
    const styles = ['./src/styles/main.scss']
    if (fs.existsSync(style)) {
        styles.push(style)
    }

    const script = `./src/js/${name}.js`
    const scripts = ['./src/js/main.js']
    if (fs.existsSync(script)) {
        scripts.push(script)
    }

    let cssStream = gulp
        .src(styles)
        .pipe(gulpif(!isProduction, sourcemaps.init()))
        .pipe(sass({ includePaths: ['node_modules', '.'] }).on('error', sass.logError))
        .pipe(importCss())
        .pipe(autoprefixer())
        .pipe(cleanCSS())
        .pipe(concat(`${name}.css`))
        .pipe(gulpif(isProduction, rev()))
        .pipe(gulpif(!isProduction, sourcemaps.write()))
        .pipe(gulp.dest('./public'))

    const isRefresh = options && options.isRefresh
    const isWatch = process.env.IS_GULP_WATCH == 'true'
    let jsStream
    if (!isRefresh) {
        let bundler
        let props = {
            entries: scripts,
            debug: !isProduction
        }
        if (!isWatch) {
            bundler = browserify(props)
        } else {
            bundler = watchify(browserify({
                ...props,
                cache: {}, // required for watchify
                packageCache: {}, // required for watchify
            }))
        }
        bundler = bundler
            .transform(babel,
                {
                    presets: ['@babel/env', '@babel/preset-react'],
                    plugins: [
                        '@babel/plugin-transform-react-jsx',
                        ['@babel/plugin-proposal-class-properties', { loose: true }]
                    ]
                })

        function rebundle() {
            return bundler
                .bundle()
                .pipe(source(name + '.js'))
                .pipe(buffer())
                .pipe(gulpif(!isProduction, sourcemaps.init({ loadMaps: true })))
                .pipe(gulpif(isProduction, rev()))
                .pipe(gulpif(isProduction, uglify()))
                .pipe(gulpif(!isProduction, sourcemaps.write()))
                .pipe(gulpif(isWatch, cache(`${name}-js`)))
                .pipe(gulp.dest('./public'))
        }

        bundler.on('update', function () {
            const start = Date.now()
            log(`Re-bundling JS [${name}]...`)
            rebundle()
                .on('end', () => log(`Re-bundled JS [${name}] after ${Date.now() - start} ms`))
        })
        jsStream = rebundle()
    } else if (isWatch) {
        jsStream = retrieveCacheStream(`${name}-js`)
    }

    return new Promise((resolve, reject) => {
        let stream = gulp
            .src(templateFile)
            .pipe(gulpPartials(PARTIALS_DIR, { ...settings, ...(options && options.data || {}) }))
            .pipe(inject(cssStream, { ignorePath: 'public/', addRootSlash: true, removeTags: true }))
            .pipe(inject(jsStream, { ignorePath: 'public/', addRootSlash: true, removeTags: true }))

        if (options && options.permalinks) {
            stream = stream
                .pipe(prettyUrl())
        }

        stream
            .pipe(gulp.dest(dest))
            .on('end', () => resolve())
            .on('error', (...args) => reject(...args))
    })
}

function copyMisc() {
    return mergeStream(
        copy('./node_modules/font-awesome/fonts/**/*', './public/fonts'),
        copy('./node_modules/lightgallery.js/src/fonts/**/*', './public/fonts'),
        copy('./node_modules/lightgallery.js/src/img/**/*', './public/img'),
        copy('./src/fonts/**/*', './public/fonts'),
        copy('./src/root/*', './public', false)
    )
}

function watchCopy(origin, dest) {
    return gulp.watch(origin, { ignoreInitial: false, usePolling: true }, function () {
        return copy(origin, dest)
    })
}

function copy(origin, dest, cache = true) {
    let pipe = gulp
        .src(origin)

    if (cache) {
        pipe = pipe
            .pipe(cached('copy-cache'))  // If the static files are unchanged, ignore them.
    }

    return pipe.pipe(gulp.dest(dest))
}

function retrieveCacheStream(cacheName) {
    if (!cacheName || !cache.get(cacheName)) {
        throw new Error('No cache found.')
    }

    const src = require('stream').Readable({ objectMode: true })
    src._read = function () {
        // Add all files from cache
        const fileCache = cache.get(cacheName)
        const self = this
        fileCache.getFilePaths().forEach(function (filePath) {
            self.push(fileCache.get(filePath))
            self.push(null)
        })
    }

    return src
}
