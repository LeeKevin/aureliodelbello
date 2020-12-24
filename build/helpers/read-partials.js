/**
 * Dependencies
 */
const path = require('path')
const read = require('fs-readdir-recursive')

/**
 * Expose `readPartials`
 */
module.exports = readPartials

/**
 * Helper for reading a folder with partials, returns a `partials` object that
 * can be consumed by consolidate.
 *
 * @param {String} partialsPath
 * @return {Object}
 */
function readPartials(partialsPath) {
    if (!path.isAbsolute(partialsPath)) {
        throw Error("partialsPath is not an absolute path.")
    }

    var files = read(partialsPath)
    var partials = {}

    // Return early if there are no partials
    if (files.length === 0) {
        return partials
    }

    // Read and process all partials
    files.forEach(file => {
        var fileInfo = path.parse(file)
        var name = path.join(fileInfo.dir, fileInfo.name)
        var partialAbs = path.join(partialsPath, name)
        partials[name.replace(/\\/g, '/')] = partialAbs
    })

    return partials
}
