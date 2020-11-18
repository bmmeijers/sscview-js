


class LayerControl {
    constructor(map, map_setting) {
        this.map = map
        this.map_setting = map_setting
        this.tree_settings = map_setting.tree_settings
    }

    add_layercontrols(div_id) { //e.g. div_id: "fieldset-layers"

        // var container_close = document.getElementById("container-close");
        // container_close.parentNode.insertBefore(newheader, container_close)
        // var newcontainer = document.createElement("div");
        // newcontainer.class = 'w3-container w3-padding'
        let msgbus = this.map.msgbus;


        let canvas_nm = ''
        let canvas_nm_bar = ''
        let div_container_width = '100%'
        let map_description = ''
        // this.map.canvasnm_in_cbnm: if we want to display the canvas name as part of the check box name
        if ('canvas_nm' in this.map_setting && this.map.canvasnm_in_cbnm == true) {
            canvas_nm = this.map_setting.canvas_nm
            canvas_nm_bar = canvas_nm + '-'
            div_container_width = '50%'

            if (canvas_nm == 'lcanvas') {
                map_description = 'left map'
            }
            else if (canvas_nm == 'rcanvas') {
                map_description = 'right map'
            }
            else {
                map_description = 'the map'
                console.log('The map name is not as expected (see layercontrol.js)!')
            }
        }

        

        let modal_content = document.getElementById('modal-content')

        // make a container
        var div_container = document.createElement('div')
        modal_content.append(div_container)
        div_container.className = 'w3-container w3-padding'
        div_container.style.width = div_container_width
        div_container.style.display = 'inline-block'

        // make and append the layer container
        var fieldset_layers = document.createElement('fieldset')  //The <fieldset> tag draws a box around the related elements.
        div_container.append(fieldset_layers)
        fieldset_layers.className = "w3-white"
        fieldset_layers.id = canvas_nm_bar + 'fieldset-layers'  //e.g., lcanvas-fieldset-layers

        // make and append a legend
        var legend_layers = document.createElement('legend')
        fieldset_layers.append(legend_layers)
        legend_layers.innerHTML = 'Layers'
        if (map_description != '') {
            legend_layers.innerHTML = 'Layers of ' + map_description
        }


        //var fieldset_layers = document.getElementById(canvas_nm + div_id)

        //console.log('layercontro.js this.tree_settings:', this.tree_settings)

        this.tree_settings.forEach(tree_setting => {

            let layer_nm = tree_setting.layer_nm
            //console.log('map.js layer_nm:', layer_nm)
            // create a new div element 
            //var newfieldset = document.createElement("fieldset");
            //fieldset_layers.append(newfieldset)

            var lyr_setting_container = document.createElement("div");

            fieldset_layers.append(lyr_setting_container);
            lyr_setting_container.style.display = 'inline-block'
            lyr_setting_container.className = 'w3-margin-bottom w3-margin-right'
            //make the legend of the layer
            var newlegend = document.createElement("div");
            lyr_setting_container.append(newlegend); //must append at the beginning so that the content of innerHTML is effective immediately



            let canvaslyr_nm = canvas_nm_bar + layer_nm
            let id_cb = canvaslyr_nm + '-cb'
            let topic_cb = 'setting.layer.' + id_cb
            newlegend.innerHTML = `<input type="checkbox" id=${id_cb} onclick="toggleLayer(this)"> ` + layer_nm
            let cb = document.getElementById(id_cb)
            cb.checked = tree_setting.do_draw
            cb.value = topic_cb


            msgbus.subscribe(topic_cb, (topic_cb, message, sender) => {                
                tree_setting.do_draw = message //if we want to draw the layer or not                
                this.map.abortAndRender();
            });


            var div_container = document.createElement("div");
            lyr_setting_container.append(div_container)

            //make the slider for the opacity
            var opacity_div = document.createElement("span");
            div_container.appendChild(opacity_div)
            opacity_div.id = canvaslyr_nm + '-opacity-value'
            opacity_div.style.display = 'inline-block'
            opacity_div.style.width = "105px"
            opacity_div.style.cssFloat = "left";
            //we do not need to set value here because when we assign value to the slider, the event will be triggered
            //opacity_div.innerHTML = 'opacity value: ' + tree_setting.opacity

            // var slider_div = document.createElement("div");
            var slider = document.createElement("input")
            div_container.appendChild(slider)
            slider.className = 'w3-margin-right'
            slider.style.cssFloat = "left"
            // slider.id = layer_nm + '_opacity-slider';

            slider.type = 'range';
            slider.min = 0;
            slider.max = 1;
            slider.step = 0.05;
            slider.value = tree_setting.opacity; //we must set the value after setting slider.step; otherwise, uneffective
            //fieldset_layers.append(opacity_div)
            
            //console.log('')
            //console.log('layercontrol.js opacity_div1:', opacity_div)
            //console.log('layercontrol.js slider:', slider)
            //opacity_div.innerHTML += slider
            //console.log('layercontrol.js opacity_div2:', opacity_div)

            //opacity_div.innerHTML = `< div 2d = "Example-7_opacity-value" > opacity value: 1 ${slider}</div >`

            //console.log('layercontrol.js opacity_div3:', opacity_div)
            //fieldset_layers.append(opacity_div)
            //fieldset_layers.append(opacity_div, slider)


            let topic = 'setting.layer.' + canvaslyr_nm + '_opacity-slider'

            //subscription of the displayed opacity value
            msgbus.subscribe(topic, (topic, message, sender) => {
                //opacity_div.innerHTML = 'opacity value3: ' + message;
                opacity_div.innerHTML = 'opacity: ' + message;
                //console.log('layercontrol.js opacity_div.innerHTML:', opacity_div.innerHTML)
            });

            //publish new opacity value
            slider.addEventListener('input', () => {
                msgbus.publish(topic, parseFloat(slider.value));
                this.map.abortAndRender();
            });

            //publish the initial opacity value
            //this publication must be after 
            //subscription of the displayed opacity value
            //so that we see the effects imediately
            msgbus.publish(topic, parseFloat(slider.value));

            //subscription of the tree_setting opacity value
            msgbus.subscribe(topic, (topic, message, sender) => {
                tree_setting.opacity = parseFloat(message);
                this.map.abortAndRender();
            }); 
        });
    }

}

// Make function toggleLayer globally accessible so that it can be used in the innerHTML of an HTML element
// see https://stackoverflow.com/questions/14769158/making-js-local-function-globally-accessible
window.toggleLayer = function(cb) {
    let msgbus = new varioscale.MessageBusConnector();
    let topic = cb.value;

    //this topic is subscribed in method add_layercontrols of class LayerControl
    msgbus.publish(topic, cb.checked);
}

export default LayerControl