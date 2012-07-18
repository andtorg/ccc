
/**
 * Initializes a scene variable.
 * 
 * @name pvc.visual.ValueLabelVar
 * @class A scene variable holds the concrete value that 
 * a {@link pvc.visual.Role} or other relevant piece of information 
 * has in a {@link pvc.visual.Scene}.
 * Usually, it also contains a label that describes it.
 * 
 * @constructor
 * @param {any} value The value of the variable.
 * @param {any} label The label of the variable.
 */
pvc.visual.ValueLabelVar = function(value, label){
    this.value = value;
    this.label = label;
};

pvc.visual.ValueLabelVar.prototype.toString = function(){
    var label = this.label || this.value;
    return typeof label !== 'string' ? ('' + label) : label;
};