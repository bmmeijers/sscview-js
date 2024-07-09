
/* cursor as pointer for suggestions */
/*
.suggestion {
    cursor: pointer;
}
*/

/** a widget for geocoding via PDOK */
export default class PdokSuggestWidget {
    constructor(map) {

        this.map = map

        this.createElements()
        this.addEventListeners()

        this.state = {
            suggestions: [],
            highlight: -1
        }
        
        this.abortController = null;
        
        setVisibilityOff()
    }

    /** create some input elements that we can use for geo-coding*/
    createElements() {
        let inputElement = document.createElement('input')
        inputElement.setAttribute('id', 'search')
        inputElement.setAttribute('type', 'search')
        inputElement.setAttribute('placeholder', 'Search for a Dutch location...')
        inputElement.setAttribute('autocomplete', 'off')

        let buttonElement = document.createElement('button')
        buttonElement.setAttribute('id', 'clear-button')
        buttonElement.setAttribute('type', 'button')
        buttonElement.setAttribute('aria-label', 'clear')
        buttonElement.innerHTML = '&#10006;'

        // FIXME: instead of relying on the presence of this placeholder
        // we can give it while instantiating the widget
        let parent = document.getElementById('geocode-placeholder')
        parent.appendChild(inputElement)
        parent.appendChild(buttonElement)

        let divElement0 = document.createElement('div')
        parent.appendChild(divElement0)

        divElement0.style.position = 'relative'

        let divElement1 = document.createElement('div')
        divElement1.setAttribute('id', 'name-output')
        divElement1.setAttribute('class', 'container white')
        divElement1.style.position = 'absolute'
        divElement1.style.zIndex = 1

        divElement0.appendChild(divElement1)

        let ulElement = document.createElement('ul')
        divElement1.setAttribute('id', 'suggestion-output')
        divElement1.setAttribute('class', 'ul white')

        divElement1.appendChild(ulElement)
    }

    /** add event listeners to the button and the search bar */
    addEventListeners() {
        const clear = document.getElementById('clear-button');
        clear.addEventListener('click', 
            () => {
                const search = document.getElementById('search');
                search.value = '';
                // this.getSuggestions(search.value)
                search.focus()
//                this.state.suggestions = []
//                this.state.highlight = -1
            }
        );
        const search = document.getElementById('search');
        search.addEventListener('input', () => { debounce(this.getSuggestions(search.value), 750) } );
        search.addEventListener('keyup', (evt) => { this.onKeyUp (evt) });
    }

    /** Get suggestions for a text string */
    getSuggestions(searchString) {
        this.pdokRequestSuggest(searchString)
            .then((response) => { this.onSuggestReponse(response) })
    }

    /**  Perform a request to the PDOK suggest service */
    async pdokRequestSuggest(searchString, options) {
        const parameters = {
            q: searchString,
            fq: '*' // 'type:gemeente'
        };
        if (options) {
            Object.assign(parameters, options);
        }
                /*
                let abortController = new AbortController();
                const signal = abortController.signal;
                // fire request for tile retrieval
                fetch(tile.getRequestUrl(), { mode: 'cors', signal})
                abortController.abort()
                */

        if (this.abortController !== null) {
            this.abortController.abort()
            this.abortController = null
        }
        this.abortController = new AbortController()
        const signal = this.abortController.signal;

        let endpoint_url = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest'
        const response = await fetch(endpoint_url + formatURL({
            query: parameters,
        }),  { mode: 'cors', signal});
        if (!response.ok) {
            throw new Error('Response from locatieserver suggest endpoint not ok');
        }
        
        return await response.json();
    }
    
    /** Process the suggest response */
    onSuggestReponse (input) {
        // parse the response into the suggestions array
        this.state.suggestions = this.parseSuggestReponse(input)

        // set the first item highlighted (for if the user presses enter)
        if (this.state.highlight == -1) {
            this.state.highlight = 0
        }
        // and display the suggestions by modifying the DOM
        // and adding each suggestion onto the webpage
        this.displaySuggestions(this.state.suggestions)
        this.updateHighlight()
        setVisibilityOn()
    }
    
    parseSuggestReponse(response) {
        let suggestions = []
        let i = 0
        for (const doc of response.response.docs) {
            if ('highlighting' in response && 'id' in doc && doc.id in response.highlighting && 'suggest' in response.highlighting[doc.id] && response.highlighting[doc.id].suggest.length > 0)
            {
                suggestions.push({
                    id: doc.id, 
                    suggestionHTML: response.highlighting[doc.id].suggest[0],
                    suggestion: doc.weergavenaam,
                    type: doc.type
                })
            }
            i += 1
            if (i >= 4) { break }
        }
        return suggestions
    }

    displaySuggestions(suggestions) {
        // remove old suggestions, if any
        removeAllChilds('suggestion-output')

        // add new elements
        let ul = document.getElementById('suggestion-output')
        for (let item of suggestions)
        {
            let li = document.createElement("li")
            li.setAttribute('class', 'suggestion is-marginless')
            
            let a = document.createElement("a")
            a.innerHTML = `<div style="display: inline-block; cursor: pointer; width: 100%;">
<div class="small">${item.suggestion}</div>
<div class="text-gray small">${item.type}</div>
</div>`
            a.addEventListener('click', 
                (event) => {
                    event.preventDefault()
                    this.performLookupForId(item)
                });
            li.appendChild(a)
            ul.appendChild(li)
        }
    }

    /** Perform a lookup for the id */
    performLookupForId(obj) {
        console.log(obj)
        // put the clicked value into the bar
        let el = document.getElementById('search')
        el.value = obj.suggestion
        // make the lookup call for the interested one
        this.pdokLookup( obj.id ).then((response) => { this.onLookupResult(response) })
        // remove all suggestions
        removeAllChilds('suggestion-output')
    }

    /** Perform a request to the lookup service */
    async pdokLookup(id, options) {
        const parameters = {
            id,
        };
        if (options) {
            Object.assign(parameters, options);
        }

        if (this.abortController !== null) {
            this.abortController.abort()
            this.abortController = null
        }
        this.abortController = new AbortController()
        const signal = this.abortController.signal;

        let endpoint_url = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup'
        const response = await fetch(endpoint_url + formatURL({
            query: parameters,
        }),  { mode: 'cors', signal});
        if (!response.ok) {
            throw new Error('Response from locatieserver lookup endpoint not ok');
        }
        return await response.json();
    }

    /** When a lookup result arrives, we jump the map to the coordinates */
    onLookupResult(result) {
        if ('docs' in result.response && result.response.docs.length > 0)
        {
            let wkt = result.response.docs[0].centroide_rd;
            // poor mens wkt parse for POINT(.. ..) 
            // stripping off 'point(' [6 chars] and leaving out ')' [1 char] at the end
            let coords = wkt.slice(6, wkt.length-1).split(' ').map(Number)

            // dependent on the type, determine a relevant scale denominator
            // valid types:
            //        provincie; gemeente; woonplaats; weg;
            //        postcode; adres; perceel; hectometerpaal;
            //        wijk; buurt; waterschapsgrens; appartementsrecht.
            let scaleDenominator = 10000
            switch(result.response.docs[0].type) {
                case "provincie":
                    scaleDenominator = 384000
                    break
                case "gemeente":
                case "waterschapsgrens":
                    scaleDenominator = 48000
                    break
                case "woonplaats":
                    scaleDenominator = 24000
                    break
                case "postcode":
                    scaleDenominator = 6000
                    break
                case "weg":
                case "adres":
                case "perceel":
                case "appartementsrecht":
                case "hectometerpaal":
                    scaleDenominator = 1500
                    break
            }
            this.map.flyTo(coords[0], coords[1], scaleDenominator)
//            this.map.jumpTo(coords[0], coords[1], scaleDenominator)

            // hide the suggestions
            setVisibilityOff()
            // reset the variables
            this.state.suggestions = []
            this.state.highlight = -1
        }
    };


    /*
    * Handle key events
    */
    onKeyUp(e) {
        switch (e.code)
        {
            case ('ArrowUp'):
            {
                this.onArrowUp()
                break
            }
            case ('ArrowDown'):
            {
                this.onArrowDown()
                break
            }
            case ('Enter'):
            {
                if (this.state.suggestions.length > 0 && this.state.highlight != -1)
                {
                    this.onEnter()
                }
                break
            }
            default:
            {
                break
            }
        }
    }

    onEnter()
    {
        this.performLookupForId(this.state.suggestions[this.state.highlight], null)
    }

    onArrowDown()
    {
        if (this.state.highlight < this.state.suggestions.length - 1) {
            this.state.highlight++
        }
        else if (this.state.suggestions.length > 0)
        {
            this.state.highlight = 0
        }
        this.updateHighlight()
    }

    onArrowUp() {
        if (this.state.highlight > 0) {
            this.state.highlight--
        }
        else if (this.state.suggestions.length > 0)
        {
            this.state.highlight = this.state.suggestions.length - 1
        }
        this.updateHighlight()
    }

    updateHighlight()
    {
        let childs = document.getElementById("suggestion-output").childNodes;
        for (let i=0; i < childs.length; i++) 
        {
            childs[i].classList.remove("is-active")
            childs[i].classList.add("small")
        }
        if (childs.length > 0 && this.state.highlight >= 0 && this.state.highlight < childs.length) // FIXME:or length-1?
        {
            childs[this.state.highlight].classList.add("is-active")
        }
    }
}

/** debounce many calls (prevent race conditions) */
function debounce(callback, wait) {
    let timeout;
    return (...args) => {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => callback.apply(context, args), wait);
    };
}


// FIXME: non-hardcoded container / class names
let setVisibilityOn = () => {
//     document.getElementById("name-output").classList.remove("w3-hide")
}
let setVisibilityOff = () => {
    removeAllChilds('suggestion-output')
//    document.getElementById("name-output").classList.add("w3-hide")
}

/** format the parameters for use in a URL */
let formatURL = (options) => {
    let url = '?';

    for (const parameterName in options.query) {
        url += (url.length > 1 ? '&' : '') + parameterName + '=' + options.query[parameterName];
    }

    return url;
}

/** Remove all DOM child nodes from an element that is selected by its id */
let removeAllChilds = (name) => {
    let div = document.getElementById(name)

    // remove all child elements from a DOM node
    let child = div.firstElementChild
    while(child)
    {
        div.removeChild(child)
        child = div.firstElementChild
    }
}

