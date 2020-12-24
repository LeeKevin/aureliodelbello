require('./details-shim')

class Details {
    constructor(el, settings = {}) {
        this.group = el
        this.details = this.group.getElementsByClassName("accordion-tab")
        this.toggles = this.group.getElementsByClassName("accordion-tab__summary")
        this.contents = this.group.getElementsByClassName("accordion-tab__content")
        this.settings = {
            speed: settings.speed ? settings.speed : 300,
            one_visible: settings.one_visible ? settings.one_visible : false,
            onToggle: settings.onToggle,
        }
        this.expanded = false
    }

    resize() {
        const _this = this;
        for (let i = 0; i < _this.details.length; i++) {
            const detail = _this.details[i]
            const toggle = _this.toggles[i]
            const content = _this.contents[i]

            // Set initial height to transition from
            if (!detail.hasAttribute("open")) {
                detail.style.height = toggle.clientHeight + "px"
            } else {
                detail.style.height = toggle.clientHeight + content.clientHeight + "px"
            }
        }
    }

    open(i) {
        const detail = this.details[i]
        const toggle = this.toggles[i]
        const content = this.contents[i]

        // If applicable, hide all the other details first
        if (this.settings.one_visible) {
            for (let a = 0; a < this.toggles.length; a++) {
                if (i !== a) this.close(a)
            }
        }

        // Update class
        detail.classList.remove("is-closing")

        // Get height of toggle
        const toggle_height = toggle.clientHeight

        // Momentarily show the contents just to get the height
        detail.setAttribute("open", true)
        const content_height = content.clientHeight
        detail.removeAttribute("open")

        // Set the correct height and let CSS transition it
        detail.style.height = toggle_height + content_height + "px"

        // Finally set the open attr
        detail.setAttribute("open", true)
        this.expanded = this.isAllExpanded()
        if (this.settings.onToggle) this.settings.onToggle(this)
    }

    close(i) {
        const detail = this.details[i]
        const toggle = this.toggles[i]

        // Update class
        detail.classList.add("is-closing")

        // Get height of toggle
        const toggle_height = toggle.clientHeight

        // Set the height so only the toggle is visible
        detail.style.height = toggle_height + "px"

        setTimeout(() => {
            // Check if still closing
            if (detail.classList.contains("is-closing"))
                detail.removeAttribute("open")
            detail.classList.remove("is-closing")
            this.expanded = false
            if (this.settings.onToggle) this.settings.onToggle(this)
        }, this.settings.speed)
    }

    init() {
        const _this = this;

        // Setup toggle click
        let expanded = true
        for (let i = 0; i < _this.details.length; i++) {
            const detail = _this.details[i];
            const toggle = _this.toggles[i];
            const content = _this.contents[i];

            // Set transition-duration to match JS setting
            detail.style.transitionDuration = _this.settings.speed + "ms"

            // Set initial height to transition from
            if (!detail.hasAttribute("open")) {
                detail.style.height = toggle.clientHeight + "px"
            } else {
                detail.style.height = toggle.clientHeight + content.clientHeight + "px"
            }

            // Setup click listener
            const clickListener = (e) => {
                e.preventDefault()
                e.stopPropagation()

                if (!detail.hasAttribute("open")) {
                    _this.open(i)
                } else {
                    _this.close(i)
                }
            }
            toggle.addEventListener("click", clickListener)
            toggle.addEventListener("touchstart", clickListener)
            expanded = expanded && this.isExpanded(i)
        }
    }

    closeAll() {
        for (let a = 0; a < this.toggles.length; a++) {
            this.close(a)
        }
    }

    openAll() {
        for (let a = 0; a < this.toggles.length; a++) {
            this.open(a)
        }
    }

    isExpanded(i) {
        const detail = this.details[i]

        return detail.hasAttribute('open')
    }

    isAllExpanded() {
        for (let a = 0; a < this.details.length; a++) {
            if (!this.isExpanded(a)) {
                return false
            }
        }

        return true
    }
}

module.exports = Details