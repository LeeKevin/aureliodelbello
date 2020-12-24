var through2 = require('through2')
var PluginError = require('plugin-error')
var extend = require('extend')
var path = require('path')
var render = require('./helpers/render')
var readPartials = require('./helpers/read-partials')

var PLUGIN_NAME = 'gulp-partials'

function error(message) {
    return new PluginError(PLUGIN_NAME, message)
}

function gulpPartials(partialPath, opts) {
    const options = extend({}, opts || {})

    /**
     * Process any partials and pass them to consolidate as a partials object
     */
    if (partialPath && typeof partialPath === 'string') {
        if (!path.isAbsolute(partialPath)) {
            partialPath = path.join(path.dirname(module.parent.filename), partialPath)
        }

        options.partials = readPartials(partialPath)
    } else {
        options.partials = {}
    }

    return through2.obj(function (target, enc, next) {
        if (target.isStream()) {
            return next(error('Streams not supported for target templates!'))
        }

        const contents = String(target.contents)
        render(contents, options)
            .then((str) => {
                target.contents = new Buffer(str)
            })
            .catch(err => {
                next(err)
            })

        this.push(target)
        next()
    })
}

module.exports = gulpPartials
