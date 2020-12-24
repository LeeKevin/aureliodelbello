import './photos/animate-scroll'

window.addEventListener('load', function () {
    new AnimOnScroll(document.getElementById('grid'), {
        minDuration: 0.4,
        maxDuration: 0.7,
        viewportFactor: 0.2
    })

    lightGallery(document.getElementById('grid'), {
        selector: '.grid-item',
        download: false,
        counter: false,
    })
})
