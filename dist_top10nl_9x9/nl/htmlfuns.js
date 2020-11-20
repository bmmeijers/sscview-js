function enhanceMenu() {
    /* opening and closing the settings modal dialog */
    // FIXME: repetition of names and ids here is cumbersome
    function toggleSettingsButton() {
        var x = document.getElementById("settingsModal");
        var btn = document.getElementById("settingButton");
        //console.log('htmlfuns.js x.style.visibility before:', x.style.visibility)
        if (x.style.visibility == 'visible') {
            x.style.visibility = 'hidden'
            btn.src = "https://pengdlzn.github.io/webmaps/decorations/setting-hollow.svg"
        }
        else {
            x.style.visibility = 'visible'
            btn.src = "https://pengdlzn.github.io/webmaps/decorations/setting-solid.svg"
        }
        //console.log('htmlfuns.js x.style.visibility after:', x.style.visibility)
    };
    toggleSettingsButton() //by default, the visibility is 'hidden', so we call the function to make it 'visible'
    document.getElementById("toggleSettingsButton").addEventListener('click', toggleSettingsButton);
    
    //toggleSettingsButton()
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
        let msgbus = new varioscale.MessageBusConnector();
        let event_nm = "settings." + name  //e.g., event_nm: "settings.zoom-factor"
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

}


