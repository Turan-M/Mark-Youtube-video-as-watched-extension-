const CLASS_NAMES = {
    button:  'markers-extension_button',
    markable: 'markers-extension_markable',
    marked: 'markers-extension_marked'
}

function isAbsoluteUrl (string)
{
    return string?.indexOf('http://') === 0 || string?.indexOf('https://') === 0
}

function normalizeUrl (url)
{
    return isAbsoluteUrl(url) ? new URL(url).pathname + new URL(url).search : url
}

function debounce (func, timeout = 300)
{
    let timer
    return (...args) => {
        clearTimeout(timer)
        timer = setTimeout(() => { func.apply(this, args) }, timeout)
    }
}

class Youtube 
{

     onChange (callback)
    {
        const contentObserver = new MutationObserver(callback)

        contentObserver.observe(document.body, { subtree: true, childList: true, attributes: false })
    }

    addButton (item, button)
    {
        item.appendChild(button.element)
    }

    toggleItem (item)
    {
        return item.classList.toggle(CLASS_NAMES.marked)
    }

    markItem (item)
    {
        item.classList.add(CLASS_NAMES.marked)
    }

    getItems ()
    {
        return Array.from(document.querySelectorAll('ytd-thumbnail, .ytp-left-controls')).
            filter(item => item.classList.contains('ytd-miniplayer-toast') === false)
    }

    getUrl (item)
    {
        let url = this.#getUrlWithoutNormalization(item)

        url = new URL(isAbsoluteUrl(url) ? url : 'https://www.youtube.com' + url)

        return url.pathname + '?v=' + url.searchParams.get('v')
    }

    #getUrlWithoutNormalization (item)
    {

        // Channel home page
        const channelPlayer = item.closest('ytd-channel-video-player-renderer')
        if (channelPlayer) {
            return channelPlayer.querySelector('.ytp-title-link').href
        }

        // Single video page
        if (item.classList.contains('ytp-left-controls')) {
            return 'https://www.youtube.com/watch?v=' + (new URLSearchParams(window.location.search).get('v'))
        }

        // Video thumbnail
        return item.querySelector('.ytd-thumbnail').href
    }

    unmarkItem(item) {
        item.classList.remove(CLASS_NAMES.marked);
    }
}

class LocalStorage
{
    async get (key)
    {
        return (await chrome.storage.local.get(key))[key]
    }

    async set (key, value)
    {      
        return await chrome.storage.local.set({ [key]: value })
    }

    async getMany (keys)
    {
        return await chrome.storage.local.get(keys)
    }

    async setMany (values)
    {
        return await chrome.storage.local.set(values)
    }

    async getMarkerState (url)
    {
        return this.get(this.makeKey(url))
    }

    async setMarkerState (url, state)
    {
        return await this.set(this.makeKey(url), state)
    }

    makeKey (url)
    {
        return `markers.${normalizeUrl(url)}`;
    }
}

class Button
{
    constructor ()
    {
        this.element = document.createElement('div')
        this.element.classList.add(CLASS_NAMES.button)
    }

    click (handler)
    {
        this.element.addEventListener('click', e => {
            e.preventDefault()
            e.stopPropagation()
            handler()
        })
    }
}



class Markers
{

    constructor ()
    {
        this.storage = new LocalStorage()
        this.driver = new Youtube()
    }

    async init ()
    {
            this.driver.onChange(debounce(() => this.addButtons(), 250))
            this.startMonitoring(); 
    }

    startMonitoring() {
        
        setInterval(async () => {
            const items = this.driver.getItems(); 
            for (const item of items) {
                const url = this.driver.getUrl(item);
                const isMarked = await this.storage.getMarkerState(url);
                if (isMarked === '1' && !item.classList.contains(CLASS_NAMES.marked)) {
                    this.driver.markItem(item);
                } else if (isMarked !== '1' && item.classList.contains(CLASS_NAMES.marked)) {
                    this.driver.unmarkItem(item); 
                }
            }
        }, 10000);
    }

    addButtons ()
    {
        

        this.driver.getItems().
            filter(item => !item.classList.contains(CLASS_NAMES.markable)).
            filter(item => !item.querySelector(CLASS_NAMES.button)).
            forEach(async (item) => {
                item.classList.add(CLASS_NAMES.markable)

                let button = new Button()
                button.click(() => this.toggle(item))
                this.driver.addButton(item, button)

                const isMarked = await this.storage.getMarkerState(this.driver.getUrl(item))
                if (isMarked === '1') {
                    this.driver.markItem(item)
                }
            })
    }

    async toggle(item) {
        let isMarked = this.driver.toggleItem(item);
        const urlKey = this.driver.getUrl(item);
    
        if (isMarked) {
            
            this.storage.setMarkerState(urlKey, '1');
        } else {
            
            chrome.storage.local.remove(this.storage.makeKey(urlKey), function() {
                console.log('Mark removed successfully.');
            });
        }
    }
    
}

const markers = new Markers()
markers.init()

