function enhanceMenu() {
    /* opening and closing the settings modal dialog */
    // FIXME: repetition of names and ids here is cumbersome
    let msgbus = new varioscale.MessageBusConnector();

    var modal = document.getElementById("settingsModal");
    function toggleSettings() {
        
        var img = document.getElementById("toggleSettingsImg");
        //console.log('htmlfuns.js x.style.visibility before:', x.style.visibility)
        if (modal.style.visibility == 'visible') {
            modal.style.visibility = 'hidden'
            img.src = "https://pengdlzn.github.io/webmaps/decorations/setting-hollow-white.svg"
        }
        else {
            modal.style.visibility = 'visible'
            img.src = "https://pengdlzn.github.io/webmaps/decorations/setting-solid-white.svg"
        }
        //console.log('htmlfuns.js x.style.visibility after:', x.style.visibility)
    };
    toggleSettings() //by default, the visibility is 'hidden', so we call the function to make it 'visible'
    document.getElementById("toggleSettingsButton").addEventListener('click', toggleSettings);

    var start_visibility = modal.style.visibility
    msgbus.subscribe('go-to-start', (topic, message, sender) => {
        if (modal.style.visibility != start_visibility) {
            toggleSettings()
        }
    });

    //toggleSettings()
    //The below code is for the cross of the setting panel, where the cross is used to close the panel
    //var modalSettingsClose = function () {
        
    //    document.getElementById('settingsModal').style.visibility = 'hidden';
    //}
    //document.getElementById("closeSettingsButton").addEventListener('click', modalSettingsClose);
    //document.getElementById("closeSettingsSpan").addEventListener('click', modalSettingsClose);

    //trigger the click event of openSettingsButton
    //const event_modalSettings = new Event('click')
    //document.getElementById("openSettingsButton").dispatchEvent(event_modalSettings)
    






    // the menu on the top
    function toggleMenu() {
        var x = document.getElementById("menu");
        if (x.className.indexOf("w3-show") == -1) {
            x.className += " w3-show";
        } else {
            x.className = x.className.replace(" w3-show", "");
        }
    };

    //const event_toggleMenu = new Event('click')
    //document.getElementById("toggleMenu").addEventListener('click', toggleMenu);
    //document.getElementById("toggleMenu").dispatchEvent(event_toggleMenu)

    
    /* -- start slider -- */    
    let init_slider = (name) => {
        
        let slider = document.getElementById(name);
        let el = document.getElementById(name + "-value");
        let initial_value = parseFloat(slider.value); //save the initial values so that we can go to the start status

        let event_nm = "settings." + name  //e.g., event_nm: "settings.zoom-factor"
        msgbus.subscribe(event_nm, (topic, message, sender) => {            
            el.innerHTML = message;
        });

        
        slider.addEventListener('input', () => {
            //console.log("htmlfuns.js slider's event listener")
            msgbus.publish(event_nm, parseFloat(slider.value));
        });
        msgbus.publish(event_nm, parseFloat(slider.value));

        //event for foing to the start status
        msgbus.subscribe('go-to-start', (topic, message, sender) => {
            slider.value = initial_value;
            msgbus.publish(event_nm, initial_value); //publish the normal event to make effect
        });
    };

    init_slider("zoom-factor");
    init_slider("zoom-duration");
    init_slider("pan-duration");
    init_slider("boundary-width");
    /* -- end of slider -- */

    document.getElementById("gobackButton").addEventListener('click', () => {
        msgbus.publish("go-to-start");
    });
}

// Surprisingly, this function doesn't work if being put into function enhanceMenu
function toggleLegend() {
    var x = document.getElementById("Demo");
    if (x.className.indexOf("w3-show") == -1) {
        x.className += " w3-show";
    } else {
        x.className = x.className.replace(" w3-show", "");
    }
}

function getX(e) {
    // fixme: also handle touch events
    // var e = e.touches ? e.touches[0] : e;
    // fixme: handle initial position 
    // (e.g. at center, instead of completely at left)
    let x = e.clientX;
    if (x < 1) x = 1; //avoid the width of a canvas to be 0; otherwise, tricky to computer scale

    // console.log('comparer.html:', x)
    let hGap = 0;
    let newWidth = window.innerWidth - hGap;
    if (x > newWidth - 1) x = newWidth - 1;

    return x;
}