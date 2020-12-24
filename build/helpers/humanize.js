/**
 * Convert a slugged string to title case with spaces
 *
 * @param str
 * @returns {string}
 */
function humanize(str) {
    let frags = str.split('_')
    for (let i = 0; i < frags.length; i++) {
        frags[i] = frags[i].charAt(0).toUpperCase() + frags[i].slice(1)
    }

    return frags.join(' ')
}

module.exports = humanize