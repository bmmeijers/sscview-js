


class LayerControl {
    constructor(map, map_setting) {
        this.map = map
        this.map_setting = map_setting
        this.tree_settings = map_setting.tree_settings
    }

    add_layercontrols(div_id) {

        // var container_close = document.getElementById("container-close");
        // container_close.parentNode.insertBefore(newheader, container_close)
        // var newcontainer = document.createElement("div");
        // newcontainer.class = 'w3-container w3-padding'
        let msgbus = this.map.msgbus;
        var fieldsets_rendering = document.getElementById(div_id)

        let canvas_nm = ''
        if ('canvas_nm' in this.map_setting && this.map.canvasnm_in_cbnm == true) {
            canvas_nm = this.map_setting.canvas_nm + '_'
        }

        //console.log('layercontro.js this.tree_settings:', this.tree_settings)

        this.tree_settings.forEach(tree_setting => {

            let layer_nm = tree_setting.layer_nm
            //console.log('map.js layer_nm:', layer_nm)
            // create a new div element 
            var newfieldset = document.createElement("fieldset");
            fieldsets_rendering.append(newfieldset)


            //make the legend of the layer
            var newlegend = document.createElement("legend");
            newfieldset.append(newlegend); //must append at the beginning so that the content of innerHTML is effective immediately



            let canvaslyr_nm = canvas_nm + layer_nm
            let id_cb = canvaslyr_nm + '_cb'
            let topic_cb = 'setting.layer.' + canvaslyr_nm + '_cb'
            newlegend.innerHTML = `<input type="checkbox" id=${id_cb} onclick="toggleLayer(this)"> ` + canvaslyr_nm
            let cb = document.getElementById(id_cb)
            cb.checked = tree_setting.do_draw
            cb.value = topic_cb


            msgbus.subscribe(topic_cb, (topic_cb, message, sender) => {                
                tree_setting.do_draw = message //if we want to draw the layer or not                
                this.map.abortAndRender();
                //console.log('layercontrol.js tree_setting.do_draw:', tree_setting.do_draw)
            });


            //make the slider for the opacity
            var opacity_div = document.createElement("div");
            opacity_div.id = canvaslyr_nm + '_opacity-value'

            // var slider_div = document.createElement("div");
            var slider = document.createElement("input")
            // slider.id = layer_nm + '_opacity-slider';
            slider.type = 'range';
            slider.min = 0;
            slider.max = 1;
            slider.step = 0.025;
            slider.value = tree_setting.opacity; //we must set the value after setting slider.step; otherwise, uneffective

            newfieldset.append(opacity_div, slider)


            let topic = 'setting.layer.' + canvaslyr_nm + '_opacity-slider'






            //subscription of the displayed opacity value
            msgbus.subscribe(topic, (topic, message, sender) => {
                opacity_div.innerHTML = 'opacity value: ' + message;
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

////this function is indeed used in class LayerControl
//function toggleLayer(cb) { //better to put this function into map.js if we can
//    let msgbus = new varioscale.MessageBusConnector();
//    let topic = cb.value;

//    //this topic is subscribed in method add_layercontrols of class LayerControl
//    msgbus.publish(topic, cb.checked);
//}

export default LayerControl