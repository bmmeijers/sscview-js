
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
        divElement0.style.position = 'relative'

        let divElement1 = document.createElement('div')
        divElement1.setAttribute('id', 'name-output')
        divElement1.style.position = 'absolute'
        divElement1.style.zIndex = 1

        divElement0.appendChild(divElement1)
        parent.appendChild(divElement0)
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
        search.addEventListener('input', () => { this.getSuggestions(search.value) } );
        search.addEventListener('keyup', this.onKeyUp);
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
        const response = await fetch('https://geodata.nationaalgeoregister.nl/locatieserver/v3/suggest' + formatURL({
            query: parameters,
        }));
        if (!response.ok) {
            throw new Error('Response from locatieserver suggest endpoint not ok');
        }
        return await response.json();
    }
    
    /** Process the suggest response */
    onSuggestReponse (input) {
        // parse the response into the suggestions array
        let suggestions = this.parseSuggestReponse(input)

        // set the first item highlighted (for if the user presses enter)
        if (this.state.highlight == -1) {
            this.state.highlight = 0
        }
        // and display the suggestions by modifying the DOM
        // and adding each suggestion onto the webpage
        this.displaySuggestions(suggestions)
        setVisibilityOn()
    }
    
    parseSuggestReponse(response) {
        let suggestions = []
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
        }
        return suggestions
    }

    displaySuggestions(suggestions) {
        // remove old suggestions, if any
        removeAllChilds('name-output')

        // add new elements
        let div = document.getElementById('name-output')
        for (let item of suggestions)
        {
            let p = document.createElement("p")
            p.setAttribute('class', 'suggestion')
            let a = document.createElement("a")
            a.innerHTML = item.suggestion + " [" +item.type+"]"
            a.addEventListener('click', this.performLookupForId.bind(this, item), false);
            p.appendChild(a)
            div.appendChild(p)
        }
    }

    /** Perform a lookup for the id */
    performLookupForId(obj) {
        // put the clicked value into the bar
        let el = document.getElementById('search')
        el.value = obj.suggestion
        // make the lookup call for the interested one
        this.pdokLookup( obj.id ).then((response) => { this.onLookupResult(response) })
        // remove all suggestions
        removeAllChilds('name-output')
    }

    /** Perform a request to the lookup service */
    async pdokLookup(id, options) {
        const parameters = {
            id,
        };
        if (options) {
            Object.assign(parameters, options);
        }
        const response = await fetch('https://geodata.nationaalgeoregister.nl/locatieserver/v3/lookup' + formatURL({
            query: parameters,
        }));
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
//            suggestions = []
//            highlight = -1
        }
    };

}

// FIXME: non-hardcoded container names
let setVisibilityOn = () => {
    document.getElementById("name-output").classList.remove("w3-hide")
}
let setVisibilityOff = () => {
    document.getElementById("name-output").classList.add("w3-hide")
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


//let initHTML = () => {
//    let inputElement = document.createElement('input')
//    inputElement.setAttribute('id', 'search')
//    inputElement.setAttribute('type', 'search')
//    inputElement.setAttribute('placeholder', 'Search location...')
//    inputElement.setAttribute('autocomplete', 'off')

//    let buttonElement = document.createElement('button')
//    buttonElement.setAttribute('id', 'clear-button')
//    buttonElement.setAttribute('type', 'button')
//    buttonElement.setAttribute('aria-label', 'clear')
//    buttonElement.innerHTML = '&#10006;'

//    let parent = document.getElementById('geocode-placeholder')
//    parent.appendChild(inputElement)
//    parent.appendChild(buttonElement)

//    let divElement0 = document.createElement('div')
//    divElement0.style.position = 'relative'

//    let divElement1 = document.createElement('div')
//    divElement1.setAttribute('id', 'name-output')
//    divElement1.style.position = 'absolute'
//    divElement1.style.zIndex = 1

////    let divElement2 = document.createElement('div')
////    divElement2.setAttribute('id', 'img-output')
////    divElement2.style.position = 'absolute'
////    divElement2.style.zIndex = 0


//    divElement0.appendChild(divElement1)
////    divElement0.appendChild(divElement2)

//    parent.appendChild(divElement0)

//}

////let initHandlers = (getSuggestions, onKeyUp) => {
////    const clear = document.getElementById('clear-button');
////    clear.addEventListener('click', 
////        () => {
////            const search = document.getElementById('search');
////            search.value = '';
////            getSuggestions(search.value)
////            search.focus()
////            suggestions = []
////            highlight = -1
////        }
////    );

////    const search = document.getElementById('search');
////    search.addEventListener('input', () => getSuggestions(search.value));
////    search.addEventListener('keyup', onKeyUp);
////}

//export default function PdokSuggestWidget() {
//    initHTML()
//    let funcs = searchComponent()
////    initHandlers(funcs[0], funcs[1])
//}

////document.addEventListener('DOMContentLoaded', (event) => {
////    setUp()
////});


////export default class PdokSuggestWidget {
////    constructor(map) {

//////        this.highlight = -1
//////        this.suggestions = []

////        this.map = map

////        this.initHTML()
//////        let funcs = searchComponent()
//////        initHandlers(funcs[0], funcs[1])

////    }

////    initHTML() {
////        let inputElement = document.createElement('input')
////        inputElement.setAttribute('id', 'search')
////        inputElement.setAttribute('type', 'search')
////        inputElement.setAttribute('placeholder', 'Search for a location...')
////        inputElement.setAttribute('autocomplete', 'off')

////        let buttonElement = document.createElement('button')
////        buttonElement.setAttribute('id', 'clear-button')
////        buttonElement.setAttribute('type', 'button')
////        buttonElement.setAttribute('aria-label', 'clear')
////        buttonElement.innerHTML = '&#10006;'

////        let parent = document.getElementById('geocode-placeholder')
////        parent.appendChild(inputElement)
////        parent.appendChild(buttonElement)

////        let divElement0 = document.createElement('div')
////        divElement0.style.position = 'relative'

////        let divElement1 = document.createElement('div')
////        divElement1.setAttribute('id', 'name-output')
////        divElement1.style.position = 'absolute'
////        divElement1.style.zIndex = 1

////        let divElement2 = document.createElement('div')
////        divElement2.setAttribute('id', 'img-output')
////        divElement2.style.position = 'absolute'
////        divElement2.style.zIndex = 0

////        divElement0.appendChild(divElement1)
////        divElement0.appendChild(divElement2)

////        parent.appendChild(divElement0)

////    }
////}




//let searchComponent = (map) =>
//{
//    // stateful 'global' variables
//    var highlight = -1
//    var suggestions = []
//    
//    var myMap = map

//    /*
//    * format the parameters for use in the URL
//    */
//    let formatURL = (options) => {
//        let url = '?';

//        for (const parameterName in options.query) {
//            url += (url.length > 1 ? '&' : '') + parameterName + '=' + options.query[parameterName];
//        }

//        return url;
//    }

//    /*
//    * Remove all DOM child nodes from an element that is selected by its id
//    */
//    let removeAllChilds = (name) => {
//        let div = document.getElementById(name)

//        // remove all child elements from a DOM node
//        let child = div.firstElementChild
//        while(child)
//        {
//            div.removeChild(child)
//            child = div.firstElementChild
//        }
//    }


//    /*
//    * Process the response of a lookup
//    *
//    * - find the x,y in the response
//    * - compose a request to a WMS server & add as img element
//    * - clear & hide the list with suggestions
//    */
//    let onLookupResult = (result) => {
//        console.log(result)
//        if ('docs' in result.response && result.response.docs.length > 0)
//        {
//            let wkt = result.response.docs[0].centroide_rd;
//            // poor mens wkt parse for POINT(.. ..) 
//            // stripping off 'point(' [6 chars] and leaving out ')' [1 char] at the end
//            let coords = wkt.slice(6, wkt.length-1).split(' ').map(Number)

//            console.log(myMap)
//            console.log(coords)
//            

//            // hide the suggestions
//            setVisibilityOff()
//            // reset the variables
//            suggestions = []
//            highlight = -1
//        }
//    };


//    /*
//    * Perform a lookup, process the result (show map), remove suggestions
//    */
//    let performLookupForID = (obj, _) => { 

//        console.log(obj)

//        let el = document.getElementById('search')
//        el.value = obj.suggestion
//        pdokLookup( obj.id ).then(onLookupResult)
//        removeAllChilds('name-output')
////        removeAllChilds('img-output')

//    };

//    /*
//     * Perform a request to the suggest service
//    */
//    async function pdokSuggest(searchString, options) {
//        const parameters = {
//            q: searchString,
//            fq: '*'//'type:gemeente'
//        };

//        if (options) {
//            Object.assign(parameters, options);
//        }

//        const response = await fetch('https://geodata.nationaalgeoregister.nl/locatieserver/v3/suggest' + formatURL({
//            query: parameters,
//        }));

//        if (!response.ok) {
//            throw new Error('Response from locatieserver suggest endpoint not ok');
//        }

//        return await response.json();
//    }


//    /**
//     * Perform a request to the lookup service
//     */
//    async function pdokLookup(id, options) {
//        const parameters = {
//            id,
//        };

//        if (options) {
//            Object.assign(parameters, options);
//        }

//        const response = await fetch('https://geodata.nationaalgeoregister.nl/locatieserver/v3/lookup' + formatURL({
//            query: parameters,
//        }));

//        if (!response.ok) {
//            throw new Error('Response from locatieserver lookup endpoint not ok');
//        }

//        return await response.json();
//    }


//    /*
//    * Process the suggest response
//    */
//    let onSuggestReponse = (input) => 
//    {
//        console.log(input)

//        // parse the response into the suggestions array
//        suggestions = parseSuggestReponse(input)
//        
//        // set the first item highlighted (for if the user presses enter)
//        if (highlight == -1) {
//            highlight = 0
//        }
//        // and display the suggestions by modifying the DOM
//        // and adding each suggestion onto the webpage
//        console.log(suggestions)
//        displaySuggestions(suggestions)
//    }


//    /*
//    * Parse the response suggestion
//    */
//    function parseSuggestReponse(response) {
//        suggestions = []
//        for (const doc of response.response.docs) {
//            if ('highlighting' in response && 'id' in doc && doc.id in response.highlighting && 'suggest' in response.highlighting[doc.id] && response.highlighting[doc.id].suggest.length > 0)
//            {
//                suggestions.push({
//                    id: doc.id, 
//                    suggestionHTML: response.highlighting[doc.id].suggest[0],
//                    suggestion: doc.weergavenaam,
//                    type: doc.type
//                })
//            }
//        }
//        return suggestions
//    }


//    /*
//    * Display the suggestions in the web page
//    */
//    function displaySuggestions(suggestions)
//    {
//        // remove old suggestions, if any
//        removeAllChilds('name-output')

//        // add new elements
//        let div = document.getElementById('name-output')
//        
////        let list = suggestions.entries()
//        console.log(suggestions)
//        for (let item of suggestions)
//        {
////        for (const [i, item] of suggestions.entries())
////        {
////            [i, item] = list.next().value
//            console.log(item)
//            let p = document.createElement("p")
//            p.setAttribute('class', 'suggestion')
//            let a = document.createElement("a")
//            a.innerHTML = item.suggestion + " [" +item.type+"]"
//            a.addEventListener('click', performLookupForID.bind(null, item), false);
//            p.appendChild(a)
//            div.appendChild(p)
//        }

//        // highlight
//        updateHighlight()
//    }

//    /*
//    * request-response for getting suggestions
//    * retrieve a list of suggestions
//    */
//    const getSuggestions = (input) => {
//        if (input === "") {
//            // no user input in the input field
//            setVisibilityOff()
//            removeAllChilds('name-output')
////            removeAllChilds('img-output')
//        } else {
//            // we have some input in the input field
//            setVisibilityOn()
//            // get some suggestions
//            pdokSuggest(input).then(
//                // when these arrive, we handle the response
//                onSuggestReponse
//            )
//        }
//    };

//    /*
//    * Handle key events
//    */
//    function onKeyUp(e) {
//        switch (e.code)
//        {
//            case ('ArrowUp'):
//            {
//                onArrowUp()
//                break
//            }
//            case ('ArrowDown'):
//            {
//                onArrowDown()
//                break
//            }
//            case ('Enter'):
//            {
//                if (suggestions.length > 0 && highlight != -1)
//                {
//                    onEnter()
//                }
//                break
//            }
//            default:
//            {
//                break
//            }
//        }
//    }

//    function onEnter()
//    {
//        performLookupForID(suggestions[highlight], null)
//    }

//    function onArrowDown()
//    {
//        if (highlight < suggestions.length - 1) {
//            highlight++
//        }
//        else if (suggestions.length > 0)
//        {
//            highlight = 0
//        }
//        updateHighlight()
//    }

//    function onArrowUp() {
//        if (highlight > 0) {
//            highlight--
//        }
//        else if (suggestions.length > 0)
//        {
//            highlight = suggestions.length - 1
//        }
//        updateHighlight()
//    }

//    function updateHighlight()
//    {
//        let childs = document.getElementById("name-output").childNodes
//        for (let i=0; i < childs.length; i++) 
//        {
//            childs[i].classList.remove("is-active")
//        }
//        if (childs.length > 0 && highlight >= 0 && highlight < childs.length) // FIXME:or length-1?
//        {
//            childs[highlight].classList.add("is-active")
//        }
//    }



//    //return [getSuggestions, onKeyUp]
//    
//    const clear = document.getElementById('clear-button');
//    clear.addEventListener('click', 
//        () => {
//            const search = document.getElementById('search');
//            search.value = '';
//            getSuggestions(search.value)
//            search.focus()
//            suggestions = []
//            highlight = -1
//        }
//    );

//    const search = document.getElementById('search');
//    search.addEventListener('input', () => getSuggestions(search.value));
//    search.addEventListener('keyup', onKeyUp);
//}

/*
<div id='geocode-placeholder'></div>
*/
