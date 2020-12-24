var handlebars = require('handlebars')
var fs = require('fs')
var path = require('path')

var join = path.join

var readCache = {}

/**
 * Require cache.
 */

var cacheStore = {}

/**
 * Conditionally cache `compiled` template based
 * on the `options` filename and `.cache` boolean.
 *
 * @param {Object} options
 * @param {Function} compiled
 * @return {Function}
 * @api private
 */

function cache(options, compiled) {
    // cachable
    if (compiled && options.filename && options.cache) {
        delete readCache[options.filename]
        cacheStore[options.filename] = compiled
        return compiled
    }

    // check cache
    if (options.filename && options.cache) {
        return cacheStore[options.filename]
    }

    return compiled
}

/**
 * Read `path` with `options` with
 * callback `(err, str)`. When `options.cache`
 * is true the template string will be cached.
 *
 * @param {String} options
 * @param {Function} fn
 * @api private
 */

function read(path, options) {
    var str = readCache[path]
    var cached = options.cache && str && typeof str === 'string'

    return new Promise((resolve, reject) => {
        // cached (only if cached is a string and not a compiled template function)
        if (cached) return resolve(str)

        // read
        fs.readFile(path, 'utf8', function (err, str) {
            if (err) return reject(err)
            // remove extraneous utf8 BOM marker
            str = str.replace(/^\uFEFF/, '')
            if (options.cache) readCache[path] = str
            resolve(str)
        })
    })
}

/**
 * Read the partial from its path. When `options.cache`
 * is true the partial string will be cached.
 *
 * @param {String} options
 * @param {Function} fn
 * @api private
 */

function parsePartials(options, fn) {
    if (!options.partials) return fn()

    const partials = { ...options.partials }
    const promises = []
    Object.keys(partials).forEach(key => {
        var file = join(partials[key] + '.html')
        promises.push(
            read(file, options).then(str => {
                partials[key] = str
            })
        )
    })

    return Promise.all(promises)
        .then(() => {
            return partials
        })
}

function render(str, options, partials) {
    return new Promise((resolve, reject) => {
        try {
            for (var partial in partials) {
                handlebars.registerPartial(partial, partials[partial])
            }
            for (var helper in options.helpers) {
                handlebars.registerHelper(helper, options.helpers[helper])
            }
            var tmpl = cache(options) || cache(options, handlebars.compile(str, options))
            resolve(tmpl(options))
        } catch (err) {
            reject(err)
        }
    })
}

function renderFromString(str, options) {
    return parsePartials(options)
        .then((partials) => {
            if (cache(options)) {
                return render('', options, partials)
            } else {
                return render(str, options, partials)
            }
        })
}

module.exports = renderFromString

