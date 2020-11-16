function toggleLayer(cb) { //better to put this function into map.js if we can
    let msgbus = new varioscale.MessageBusConnector();
    let topic = cb.value;

    //this topic is subscribed in method add_layercontrols of class LayerControl
    msgbus.publish(topic, cb.checked);
}

function enhanceMenu(document) {
    /* opening and closing the settings modal dialog */
    // FIXME: repetition of names and ids here is cumbersome
    var modalSettingsOpen = function () {
        //toggleMenu(); // hide the menu
        document.getElementById('settingsModal').style.display = 'block';
    };
    var modalSettingsClose = function () {
        document.getElementById('settingsModal').style.display = 'none';
    }
    document.getElementById("openSettingsButton").addEventListener('click', modalSettingsOpen);
    document.getElementById("closeSettingsButton").addEventListener('click', modalSettingsClose);
    document.getElementById("closeSettingsSpan").addEventListener('click', modalSettingsClose);

    const event_modalSettings = new Event('click')
    document.getElementById("openSettingsButton").dispatchEvent(event_modalSettings)

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
        let msgbus = new varioscale.MessageBusConnector();
        let event_nm = "settings." + name
        msgbus.subscribe(event_nm, (topic, message, sender) => {
            let el = document.getElementById(name + "-value");
            el.innerHTML = message;
        });
        let slider = document.getElementById(name);
        slider.addEventListener('input', () => {
            msgbus.publish(event_nm, parseFloat(slider.value));
        });
        msgbus.publish(event_nm, parseFloat(slider.value));
    };
    init_slider("zoom-factor");
    init_slider("zoom-duration");
    init_slider("pan-duration");
    init_slider("boundary-width");
    /* -- end of slider -- */




    function toggleLegend() {
        var x = document.getElementById("Demo");
        if (x.className.indexOf("w3-show") == -1) {
            x.className += " w3-show";
        } else {
            x.className = x.className.replace(" w3-show", "");
        }
    }
}


