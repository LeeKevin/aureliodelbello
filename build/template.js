var streamToArray = require('stream-to-array')
var PluginError = require('plugin-error')
var handlebars = require('handlebars')
var extend = require('extend')
var path = require('path')

var readPartials = require('./helpers/read-partials')
var render = require('./helpers/render')

const PLUGIN_NAME = 'template'

const error = function (message) {
    return new PluginError(PLUGIN_NAME, message)
}

const template = function (sources, opts) {
    if (!sources) {
        throw error('Missing sources stream!')
    }
    /**
     * Init
     */
    opts = opts || {}

    // Map options to local variables
    let partials = opts.partials
    const pattern = opts.pattern
    const data = opts.data || {}

    const params = extend({}, opts)

    // Is the first parameter a Vinyl File Stream:
    if (typeof sources.on === 'function' && typeof sources.pipe === 'function') {
        const collected = streamToArray(sources)

        return (files, metalsmith, done) => {
            const metadata = metalsmith.metadata()

            /**
             * Process any partials and pass them to consolidate as a partials object
             */
            if (partials && typeof partials === 'string') {
                if (!path.isAbsolute(partials)) {
                    partials = path.join(metalsmith.path(), partials)
                }

                params.partials = readPartials(partials)
            } else {
                params.partials = {}
            }

            collected
                .then((collection) => {
                    const promises = []

                    if (collection && collection.length) {
                        const templateFile = collection[0]
                        const templateContent = String(templateFile.contents)
                        Object.keys(files).forEach(filepath => {
                            const file = files[filepath]
                            const contents = String(file.contents)

                            const options = {
                                ...params,
                                ...metadata,
                                ...(file.frontMatter || {}),
                                ...data,
                            }

                            file.original = options.contents = handlebars.compile(contents)(file.frontMatter || {})

                            promises.push(
                                render(templateContent, options)
                                    .then((str) => {
                                        file.contents = new Buffer(str)
                                    })
                                    .catch(err => done(err))
                            )
                        })
                    }

                    return Promise.all(promises)
                        .then(() => {
                            done()
                        })
                })
                .catch((err) => {
                    done(err)
                })
        }
    }

    throw error('Passing target file as a string is deprecated! Pass a vinyl file stream (i.e. use `gulp.src`)!')
}

module.exports = template

