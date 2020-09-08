function toggleLayer(cb) { //better to put this function into map.js if we can
    let msgbus = new varioscale.MessageBusConnector();
    let topic = cb.value;

    //this topic is subscribed in method add_layercontrols of class LayerControl
    msgbus.publish(topic, cb.checked);
}