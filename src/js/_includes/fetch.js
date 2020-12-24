import 'whatwg-fetch'

const fetch = window.fetch

function get(url, params, options) {
    const query = params
        ? Object
            .keys(params)
            .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
            .join('&')
        : ''
    return fetch(`${url}${query ? `?${query}` : ''}`, {
        ...options,
        method: 'GET',
    }).then(response => response.json())
}

export {
    fetch,
    get,
}
