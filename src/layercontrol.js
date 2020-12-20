


class LayerControl {
    constructor(map, map_setting) {
        this.map = map
        this.map_setting = map_setting
        this.tree_settings = map_setting.tree_settings
    }

    add_layercontrols() {

        // var container_close = document.getElementById("container-close");
        // container_close.parentNode.insertBefore(newheader, container_close)
        // var newcontainer = document.createElement("div");
        // newcontainer.class = 'w3-container w3-padding'
        let msgbus = this.map.msgbus;


        let canvas_nm = ''
        let canvas_nm_bar = ''
        let fs_div_width = '100%'
        let map_description = ''
        // this.map.canvasnm_in_cbnm: if we want to display the canvas name as part of the check box name
        if ('canvas_nm' in this.map_setting && this.map.canvasnm_in_cbnm == true) {
            canvas_nm = this.map_setting.canvas_nm
            canvas_nm_bar = canvas_nm + '-'
            fs_div_width = '50%'

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

        

        //The hierarchy of the elements of controlling layers
        //modal_content
        //  fs_div (one lyr_setting_div for each map)
        //    lyr_fs
        //      fs_legend
        //      lyr_setting_div (one lyr_setting_div for each layer)
        //        cb_lyrnm
        //        opacity_div
        //          opacitytext_span
        //          slider
        let modal_content = document.getElementById('modal-content')


        // make a division of fieldsets
        var fs_div = document.createElement('div')
        modal_content.append(fs_div)
        fs_div.className = 'w3-container w3-padding w3-show-inline-block'
        fs_div.style.width = fs_div_width

        // make and append a fieldset of layers
        var lyr_fs = document.createElement('fieldset')  //The <fieldset> tag draws a box around the related elements.
        fs_div.append(lyr_fs)
        lyr_fs.className = "w3-white"
        lyr_fs.id = canvas_nm_bar + 'fieldset-layers'  //e.g., lcanvas-fieldset-layers

        // make and append a legend of the fieldset
        var fs_legend = document.createElement('legend')
        lyr_fs.append(fs_legend)
        fs_legend.innerHTML = 'Layers'
        if (map_description != '') {
            fs_legend.innerHTML = 'Layers of ' + map_description
        }

        this.tree_settings.forEach(tree_setting => {
            //we save the initial values so that we can go to the start status
            let initial_tree_setting = Object.assign({}, tree_setting); 

            let lyrnm = tree_setting.layer_nm
            //console.log('map.js layer_nm:', layer_nm)
            // create a new div element 
            //var newfieldset = document.createElement("fieldset");
            //fieldset_layers.append(newfieldset)

            var lyr_setting_div = document.createElement("div");

            lyr_fs.append(lyr_setting_div);
            lyr_setting_div.className = 'w3-margin-bottom margin-right-32 w3-show-inline-block'
            //make the legend of the layer
            var cb_lyrnm = document.createElement("div"); //checkbox and layer name
            lyr_setting_div.append(cb_lyrnm); //must append at the beginning so that the content of innerHTML is effective immediately



            let canvaslyrnm = canvas_nm_bar + lyrnm
            let id_cb = canvaslyrnm + '-cb'
            let topic_cb = 'setting.layer.' + id_cb
            cb_lyrnm.innerHTML = `<input type="checkbox" id=${id_cb} onclick="toggleLayer(this)"> ` + lyrnm
            let cb = document.getElementById(id_cb)
            cb.checked = tree_setting.do_draw
            cb.value = topic_cb


            msgbus.subscribe(topic_cb, (topic, message, sender) => {                
                tree_setting.do_draw = message //if we want to draw the layer or not                
                this.map.abortAndRender();
            });


            var opacity_div = document.createElement("div");
            lyr_setting_div.append(opacity_div)

            var opacitytext_div = document.createElement("span")
            opacity_div.appendChild(opacitytext_div)
            opacitytext_div.className = 'w3-show-inline-block'
            opacitytext_div.innerHTML = 'opacity: '

            //make the slider for the opacity
            var opacitytext_span = document.createElement("span");
            opacity_div.appendChild(opacitytext_span)
            opacitytext_span.id = canvaslyrnm + '-opacity-value'
            opacitytext_span.className = 'span-40'
            opacitytext_span.innerHTML = tree_setting.opacity;

            var slider = document.createElement("input")
            opacity_div.appendChild(slider)
            slider.className = 'w3-show-inline-block'
            // slider.id = layer_nm + '_opacity-slider';

            slider.type = 'range';
            slider.min = 0;
            slider.max = 1;
            slider.step = 0.05;
            //we must set the value after setting slider.step; otherwise, uneffective
            slider.value = tree_setting.opacity;

            let topic_opacity = 'setting.layer.' + canvaslyrnm + '_opacity-slider'

            //subscription of the tree_setting opacity value
            msgbus.subscribe(topic_opacity, (topic, message, sender) => {
                opacitytext_span.innerHTML = message;
                tree_setting.opacity = parseFloat(message);
                this.map.abortAndRender();
            });

            //publish new opacity value
            slider.addEventListener('input', () => {
                msgbus.publish(topic_opacity, parseFloat(slider.value));
            });
            
            msgbus.subscribe('go-to-start', (topic, message, sender) => {
                //opacity value of a layer
                slider.value = initial_tree_setting.opacity;
                msgbus.publish(topic_opacity, parseFloat(slider.value));
                //if a layer should be displayed or not
                cb.checked = initial_tree_setting.do_draw
                msgbus.publish(topic_cb, initial_tree_setting.do_draw);
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