import React from './no-react'
import { DateTime } from 'luxon'

const SELECTOR = 'add-to-calendar'

const AddToCalendar = (function () {

    /*================================================================ Utils
    */

    /**
     * [formatTime description]
     *
     * @param  {Date} date [description]
     * @return {String}      [description]
     */
    function formatTime(date, timezone) {
        return DateTime.fromObject({ ...DateTime.fromJSDate(date).toObject(), zone: timezone })
                       .toUTC()
                       .toISO({ suppressMilliseconds: true })
                       .replace(/-|:|\.\d+/g, '')
    }

    function getDuration(start, end) {
        return DateTime.fromJSDate(end).diff(DateTime.fromJSDate(start)).toFormat('hhmm')
    }

    function getAgent() {
        const e = navigator.userAgent || navigator.vendor || window.opera
        return /windows phone/i.test(e) ?
            'windows_phone' :
            /android/i.test(e) ? 'android' : /iPad|iPhone|iPod/.test(e) && !window.MSStream ? 'ios' : 'unknown'
    }

    /**
     * [serialize description]
     * Object to query string (encode)
     *
     * @see http://stackoverflow.com/questions/1714786/querystring-encoding-of-a-javascript-object
     *
     * @param  obj [description]
     * @return {String}     [description]
     */
    function serialize(obj) {
        const str = []
        for (let p in obj) {
            if (obj.hasOwnProperty(p)) {
                str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]))
            }
        }

        return str.join('&')
    }

    /**
     * [replaceSpecialCharacterAndSpaceWithHyphen description]
     *
     * @see http://stackoverflow.com/questions/18936483/regex-for-replacing-all-special-characters-and-spaces-in-a-string-with-hyphens
     *
     * @param  {String} str [description]
     * @return {String}     [description]
     */
    function replaceSpecialCharacterAndSpaceWithHyphen(str) {
        return str.replace(/([~!@#$%^&*()_+=`{}\[\]\|\\:;'<>,.\/? ])+/g, '-').replace(/^(-)+|(-)+$/g, '')
    }

    /*================================================================ URL generation
    */

    function buildGoogleUrl(eventData) {
        // We pass timezone as an arg, so use naive time
        const startDate = formatTime(new Date(eventData.start)).slice(0, -1)
        const endDate = formatTime(new Date(eventData.end)).slice(0, -1)

        const googleArgs = {
            'text': (eventData.title || ''),
            'dates': startDate + '/' + endDate,
            'location': (eventData.location || ''),
            'details': (eventData.description || ''),
            'sprop': '',
            'ctz': eventData.timezone,
        }

        return 'https://www.google.com/calendar/render?action=TEMPLATE&' + serialize(googleArgs)
    }

    function buildIcsDataUrl(eventData) {
        const startDate = formatTime(new Date(eventData.start), eventData.timezone)
        const endDate = formatTime(new Date(eventData.end), eventData.timezone)

        return encodeURI(
            'data:text/calendar;charset=utf8,' +
            [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'BEGIN:VEVENT',
                'URL:' + document.URL,
                'DTSTART:' + startDate,
                'DTEND:' + endDate,
                'SUMMARY:' + (eventData.title || ''),
                'DESCRIPTION:' + (eventData.description || ''),
                'LOCATION:' + (eventData.location || ''),
                'BEGIN:VALARM',
                'TRIGGER:-PT15M',
                'ACTION:DISPLAY',
                'DESCRIPTION:Reminder',
                'END:VALARM',
                'TRANSP:OPAQUE',
                'END:VEVENT',
                'END:VCALENDAR'
            ].join('\n')
        )
    }

    function buildOffice365Url(eventData) {
        const startDate = formatTime(new Date(eventData.start), eventData.timezone)
        const endDate = formatTime(new Date(eventData.end), eventData.timezone)

        const outlookOnlineArgs = {
            'subject': (eventData.title || ''),
            'startdt': startDate,
            'enddt': endDate,
            'location': (eventData.location || ''),
            'body': (eventData.description || '')
        }

        return 'https://outlook.office.com/owa/?path=/calendar/action/compose&rru=addevent' +
            serialize(outlookOnlineArgs)
    }

    function buildOutlookOnlineUrl(eventData) {
        const startDate = formatTime(new Date(eventData.start), eventData.timezone)
        const endDate = formatTime(new Date(eventData.end), eventData.timezone)

        const outlookOnlineArgs = {
            'subject': (eventData.title || ''),
            'startdt': startDate,
            'enddt': endDate,
            'location': (eventData.location || ''),
            'body': (eventData.description || '')
        }

        return 'https://outlook.live.com/owa/?path=/calendar/action/compose&rru=addevent' +
            serialize(outlookOnlineArgs)
    }

    function buildYahooUrl(eventData) {
        const startDate = formatTime(new Date(eventData.start), eventData.timezone)

        var yahooArgs = {
            'view': 'd',
            'type': '20',
            'title': (eventData.title || ''),
            'st': startDate,
            'dur': getDuration(new Date(eventData.start), new Date(eventData.end)),
            'in_loc': (eventData.location || ''),
            'desc': (eventData.description || '')
        }

        return 'https://calendar.yahoo.com/?v=60&' + serialize(yahooArgs)
    }

    /*================================================================ HTML building
    */

    /**
     * [buildEventHtml description]
     *
     * @see http://stackoverflow.com/questions/417142/what-is-the-maximum-length-of-a-url-in-different-browsers
     *
     * @param  {String}  name
     * @param  {String}  className
     * @param  {String}  url
     * @param  {String} download
     * @return {Element}
     */
    function buildEventHtml(name, className, url, download = null) {
        let filename = undefined
        if (download) {
            filename = replaceSpecialCharacterAndSpaceWithHyphen(download).toLowerCase()
        }

        const element = <a
            target="_blank"
            href={url}
            title={name}
            className={className}
            role="menuitem"
            download={filename}
        >
            {name} {!download && <em>(online)</em>}
        </a>

        element.addEventListener('click', (event) => {
            event.stopPropagation()
        })
        element.addEventListener('touchstart', (event) => {
            event.stopPropagation()
        })
        return element
    }

    function buildEventMenu(
        eventData,
        {
            google,
            ics,
            outlook,
            yahoo,
            office,
        },
        other
    ) {
        return <div className={`${SELECTOR}_dropdown`} aria-hidden="false"  {...other}>
            {buildEventHtml('iCal', 'atcappleical', ics, eventData.title)}
            {buildEventHtml('Google', 'atcgoogle', google)}
            {buildEventHtml('Office 365', 'atcoffice365', office)}
            {buildEventHtml('Outlook', 'atcoutlook', ics, eventData.title)}
            {buildEventHtml('Outlook.com', 'atcoutlookcom', outlook)}
            {buildEventHtml('Yahoo', 'atcyahoo', yahoo)}
        </div>
    }

    const properties = [
        'start', 'end', 'timezone', 'title', 'description', 'location'
    ]

    return function (element, uniqueId) {
        const eventData = properties.reduce((data, property) => {
            const el = element.querySelector(`.${property}`)
            if (el) {
                data[property] = el.innerHTML
            }

            return data
        }, {})
        const urls = {
            google: buildGoogleUrl(eventData),
            ics: buildIcsDataUrl(eventData),
            outlook: buildOutlookOnlineUrl(eventData),
            yahoo: buildYahooUrl(eventData),
            office: buildOffice365Url(eventData),
        }
        const menu = buildEventMenu(
            eventData,
            urls,
            {
                'aria-labelledby': uniqueId,
            }
        )
        const icon = <span className={`${SELECTOR}_icon`}/>

        element.appendChild(menu)
        element.appendChild(icon)

        const attributes = {
            'title': '',
            'id': uniqueId,
            'aria-haspopup': 'true',
            'aria-expanded': 'false',
            'tabindex': '0',
            'translate': 'no',
            'data-loaded': 'true',
            'style': 'display: inline-block; visibility: visible; z-index: 1; outline: 0px;',
        }
        Object.keys(attributes).forEach((attribute) => {
            element.setAttribute(attribute, attributes[attribute])
        })

        function handleToggleMenu(event) {
            event.stopPropagation()
            event.preventDefault()

            // if ios
            if (element.getAttribute('data-intel-apple') !== 'true' && getAgent() === 'ios') {
                window.open(urls.ics, '_self')
                element.setAttribute('data-intel-apple', 'true')
                return
            }

            const className = `${SELECTOR}-selected`
            if (menu.classList.contains(className)) {
                menu.classList.remove(className)
                menu.classList.remove('topdown')
                window.removeEventListener('click', handleToggleMenu)
                window.removeEventListener('touchstart', handleToggleMenu)
                element.addEventListener('click', handleToggleMenu)
                element.addEventListener('touchstart', handleToggleMenu)
                element.setAttribute('aria-expanded', 'false')
                element.style.zIndex = '1'

                menu.setAttribute('style', '')
            } else {
                element.style.zIndex = '100000'

                menu.style.display = 'block'

                element.removeEventListener('click', handleToggleMenu)
                element.removeEventListener('touchstart', handleToggleMenu)
                window.addEventListener('click', handleToggleMenu)
                window.addEventListener('touchstart', handleToggleMenu)
                element.setAttribute('aria-expanded', 'true')

                // determine menu position
                const menuRect = menu.getBoundingClientRect()
                const elementRect = element.getBoundingClientRect()

                let top
                if (menuRect.height / 2 > window.innerHeight - elementRect.bottom) {
                    top = `-${menuRect.height - elementRect.height}px`
                } else if (menuRect.height / 2 - elementRect.height <= elementRect.top) {
                    top = `-${menuRect.height / 2 - elementRect.height}px`
                } else {
                    top = '0'
                    menu.classList.add('topdown')
                }
                menu.style.left = '-2px'
                menu.style.top = top

                menu.classList.add(className)
            }
        }

        element.addEventListener('click', handleToggleMenu)
        element.addEventListener('touchstart', handleToggleMenu)
    }
})()

window.addEventListener('load', function () {
    Array.from(document.querySelectorAll(`.${SELECTOR}`)).forEach((el, i) => {
        AddToCalendar(el, `${SELECTOR}-${i}`)
    })
})

