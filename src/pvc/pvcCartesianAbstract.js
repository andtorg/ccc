
/**
 * CartesianAbstract is the base class for all 2D cartesian space charts.
 */
pvc.CartesianAbstract = pvc.TimeseriesAbstract.extend({
    _gridDockPanel: null,
    
    axes: null,
    axesPanels: null, 
    
    yAxisPanel : null,
    xAxisPanel : null,
    secondXAxisPanel: null,
    secondYAxisPanel: null,
    
    _mainContentPanel: null, // This will act as a holder for the specific panel

    yScale: null,
    xScale: null,
    
    _axisRoleNameMap: null, 
    // example
//    {
//        'base':   'category',
//        'ortho':  'value'
//    },
    
    _visibleDataCache: null,
    
    constructor: function(options){
        
        this._axisRoleNameMap = {};
        this.axes = {};
        this.axesPanels = {};
        
        this.base(options);

        pvc.mergeDefaults(this.options, pvc.CartesianAbstract.defaultOptions, options);
    },
    
    _getSeriesRoleSpec: function(){
        return { isRequired: true, defaultDimensionName: 'series*', autoCreateDimension: true };
    },

    _initData: function(){
        // Clear data related cache
        if(this._visibleDataCache) {
            delete this._visibleDataCache;
        }
        
        this.base.apply(this, arguments);
    },

    _preRenderContent: function(contentOptions){
        var options = this.options;
        if(pvc.debug >= 3){
            pvc.log("Prerendering in CartesianAbstract");
        }
        
        /* Create the grid/docking panel */
        this._gridDockPanel = new pvc.CartesianGridDockingPanel(this, this.basePanel, contentOptions);
        
        /* Create axes */
        var baseAxis   = this._createAxis('base',  0),
            orthoAxis  = this._createAxis('ortho', 0),
            ortho2Axis = options.secondAxis ? this._createAxis('ortho', 1) : null;
        
        /* Create child axis panels
         * The order is relevant because of docking order. 
         */
        if(ortho2Axis) {
            this._createAxisPanel(ortho2Axis);
        }
        this._createAxisPanel(baseAxis );
        this._createAxisPanel(orthoAxis);
        
        /* Create scales without range yet */
        this._createAxisScale(baseAxis );
        this._createAxisScale(orthoAxis);
        if(ortho2Axis){
            this._createAxisScale(ortho2Axis);
        }
        
        /* Create main content panel */
        this._mainContentPanel = this._createMainContentPanel(this._gridDockPanel);
        
        /* Force layout */
        this.basePanel.layout();
        
        /* Set scale ranges, after layout */
        this._setAxisScaleRange(baseAxis );
        this._setAxisScaleRange(orthoAxis);
        if(ortho2Axis){
            this._setAxisScaleRange(ortho2Axis);
        }
    },
    
    /**
     * Creates a cartesian axis.
     * 
     * @param {string} type The type of the axis. One of the values: 'base' or 'ortho'.
     * @param {number} index The index of the axis within its type (0, 1, 2...).
     *
     * @type pvc.visual.CartesianAxis
     */
    _createAxis: function(axisType, axisIndex){
        var roles = def.array.as(this._axisRoleNameMap[axisType])
                        .map(function(roleName){
                            return this.visualRoles(roleName);
                        }, this);
        var axis = new pvc.visual.CartesianAxis(this, axisType, axisIndex, roles);
        
        this.axes[axis.id] = axis;
        this.axes[axis.orientedId] = axis;
        
        return axis;
    },
    
    /**
     * Creates an axis panel, if it is visible.
     * @param {pvc.visual.CartesianAxis} axis The cartesian axis.
     * @type pvc.AxisPanel
     */
    _createAxisPanel: function(axis){
        if(axis.isVisible) {
            var titlePanel;
            var title = axis.option('Title');
            if (!def.empty(title)) {
                titlePanel = new pvc.AxisTitlePanel(this, this._gridDockPanel, {
                    title:        title,
                    font:         axis.option('TitleFont'),
                    anchor:       axis.option('Position'),
                    align:        axis.option('TitleAlign'),
                    margins:      axis.option('TitleMargins'),
                    paddings:     axis.option('TitlePaddings'),
                    titleSize:    axis.option('TitleSize'),
                    titleSizeMax: axis.option('TitleSizeMax')
                });
            }
            
            var panel = pvc.AxisPanel.create(this, this._gridDockPanel, axis, {
                useCompositeAxis:  axis.option('Composite'),
                font:              axis.option('LabelFont'),
                anchor:            axis.option('Position'),
                axisSize:          axis.option('Size'),
                axisSizeMax:       axis.option('SizeMax'),
                labelSpacingMin:   axis.option('LabelSpacingMin'),
                tickExponentMin:   axis.option('TickExponentMin'),
                tickExponentMax:   axis.option('TickExponentMax'),
                fullGrid:          axis.option('FullGrid'),
                fullGridCrossesMargin: axis.option('FullGridCrossesMargin'),
                ruleCrossesMargin: axis.option('RuleCrossesMargin'),
                zeroLine:          axis.option('ZeroLine'),
                domainRoundMode:   axis.option('DomainRoundMode'),
                desiredTickCount:  axis.option('DesiredTickCount'),
                minorTicks:        axis.option('MinorTicks'),
                clickAction:       axis.option('ClickAction'),
                doubleClickAction: axis.option('DoubleClickAction')
            });
            
            if(titlePanel){
                titlePanel.panelName = panel.panelName;
                panel.titlePanel = titlePanel;
            }
            
            this.axesPanels[axis.id] = panel;
            this.axesPanels[axis.orientedId] = panel;
            
            // V1 fields
            if(axis.index <= 1) {
                this[axis.orientedId + 'AxisPanel'] = panel;
            }
            
            return panel;
        }
    },

    /* @abstract */
    _createMainContentPanel: function(parentPanel){
        throw def.error.notImplemented();
    },
    
    /**
     * Creates a scale for a given axis, assigns it to the axis
     * and assigns the scale to special v1 chart instance fields.
     * 
     * @param {pvc.visual.CartesianAxis} axis The axis.
     * @type pv.Scale
     */
    _createAxisScale: function(axis){
        var isSecondOrtho = axis.index === 1 && axis.type === 'ortho';
        
        var scale;

        if(isSecondOrtho && !this.options.secondAxisIndependentScale){
            scale = this.axes.ortho.scale || 
                    def.fail.operationInvalid("First ortho scale must be created first.");
        } else {
            scale = this._createScaleByAxis(axis);
        }
        axis.setScale(scale);
        
        /* V1 fields xScale, yScale, secondScale */
        if(isSecondOrtho) {
            this.secondScale = scale;
        } else if(!axis.index) {
            this[axis.orientation + 'Scale'] = scale;
        }
        
        return scale;
    },
    
    /**
     * Creates a scale for a given axis.
     * 
     * @param {pvc.visual.CartesianAxis} axis The axis.
     * @type pv.Scale
     */
    _createScaleByAxis: function(axis){
        var createScaleMethod = this['_create' + axis.scaleType + 'ScaleByAxis'];
        
        var dataPartValues = this._getAxisDataParts(axis);
        
        return createScaleMethod.call(this, axis, dataPartValues);
    },
    
    _getAxisDataParts: function(axis){
        return null;
    },

    /**
     * Creates a discrete scale for a given axis.
     * <p>
     * Uses the chart's <tt>panelSizeRatio</tt> to calculate the band.
     * </p>
     * 
     * @param {pvc.visual.CartesianAxis} axis The axis.
     * @param {string|string[]} [dataPartValues=null] The desired data part value or values.
     * @virtual
     * @type pv.Scale
     */
    _createDiscreteScaleByAxis: function(axis, dataPartValues){
        /* DOMAIN */

        // With composite axis, only 'singleLevel' flattening works well
        var flatteningMode = null; //axis.option('Composite') ? 'singleLevel' : null,
        var baseData = this._getVisibleData(dataPartValues);
        var data = axis.role.flatten(baseData, {
                                visible: true,
                                flatteningMode: flatteningMode
                            });
        
        var scale  = new pv.Scale.ordinal();
        scale.type = 'Discrete';
        
        if(!data.count()){
            scale.isNull = true;
            
            if(pvc.debug >= 3){
                pvc.log("Discrete scale - no data");
            }
        } else {
            var values = data.children()
                             .select(function(child){ return child.value; })
                             .array();
            
            scale.domain(values);
        }
        
        return scale;
    },
    
    /**
     * Creates a continuous time-series scale for a given axis.
     * 
     * <p>
     * Uses the axis' option <tt>Offset</tt> to calculate excess domain margins at each end of the scale.
     * </p>
     * <p>
     * Also takes into account the specified axis' options 
     * <tt>DomainRoundMode</tt> and <tt>DesiredTickCount</tt>.
     * </p>
     * 
     * @param {pvc.visual.CartesianAxis} axis The axis.
     * @param {pvc.visual.Role} role The role.
     * @param {string|string[]} [dataPartValues=null] The desired data part value or values.
     * @virtual
     * @type pv.Scale
     */
    _createTimeseriesScaleByAxis: function(axis, dataPartValues){
        /* DOMAIN */
        var extent = this._getVisibleValueExtent(axis, dataPartValues); // null when no data...
        
        var scale = new pv.Scale.linear();
        scale.type = 'Timeseries';
        
        if(!extent){
            scale.isNull = true;
            
            if(pvc.debug >= 3){
                pvc.log("Timeseries scale - no data");
            }
        } else {
            var dMin = extent.min;
            var dMax = extent.max;

            if((dMax - dMin) === 0) {
                dMax = new Date(dMax.getTime() + 3600000); // 1 h
            }
        
            scale.domain(dMin, dMax);
            
            // TODO: Domain rounding
        }
        
        return scale;
    },

    /**
     * Creates a continuous scale for a given axis.
     *
     * <p>
     * Uses the axis' option <tt>Offset</tt> to calculate excess domain margins at each end of the scale.
     * </p>
     * <p>
     * Also takes into account the specified axis' options
     * <tt>DomainRoundMode</tt> and <tt>DesiredTickCount</tt>.
     * </p>
     *
     * @param {pvc.visual.CartesianAxis} axis The axis.
     * @param {string|string[]} [dataPartValues=null] The desired data part value or values.
     * @virtual
     * @type pv.Scale
     */
    _createContinuousScaleByAxis: function(axis, dataPartValues){
        /* DOMAIN */
        var extent = this._getVisibleValueExtentConstrained(axis, dataPartValues);
        
        var scale = new pv.Scale.linear();
        scale.type = 'Continuous';
        
        if(!extent){
            scale.isNull = true;
            
            if(pvc.debug >= 3){
                pvc.log("Continuous scale - no data");
            }
        } else {
            var dMin = extent.min;
            var dMax = extent.max;
    
            /*
             * If both negative or both positive
             * the scale does not contain the number 0.
             *
             * Currently this option ignores locks. Is this all right?
             */
            var originIsZero = axis.option('OriginIsZero');
            if(originIsZero && (dMin * dMax > 0)){
                if(dMin > 0){
                    dMin = 0;
                    extent.minLocked = true;
                } else {
                    dMax = 0;
                    extent.maxLocked = true;
                }
            }
    
            /*
             * If the bounds (still) are the same, things break,
             * so we add a wee bit of variation.
             *
             * This one must ignore locks.
             */
            if (dMin === dMax) {
                dMin = dMin !== 0 ? dMin * 0.99 : originIsZero ? 0 : -0.1;
                dMax = dMax !== 0 ? dMax * 1.01 : 0.1;
            } else if(dMin > dMax){
                // What the heck...
                // Is this ok or should throw?
                var bound = dMin;
                dMin = dMax;
                dMax = bound;
            }
            
            scale.domain(dMin, dMax);
            
            // Domain rounding
            // Must be done before applying offset
            // because otherwise the offset gets amplified by the rounding
            // Then, the scale range is updated but the ticks cache is not.
            // The result is we end up showing two zones, on each end, with no ticks.
            var roundMode = axis.option('DomainRoundMode');
            if(roundMode === 'nice'){
                scale.nice();
                // Ticks domain rounding is performed during AxisPanel layout
            }
            
            if(pvc.debug >= 3){
                pvc.log("Continuous scale extent: " + JSON.stringify(extent) + 
                        " create:" + JSON.stringify({min: dMin, max: dMax}) + 
                        " niced:"  + JSON.stringify(scale.domain()));
            }
        }
        
        return scale;
    },
    
    _setAxisScaleRange: function(axis){
        var size = (axis.orientation === 'x') ?
                        this._mainContentPanel.width :
                        this._mainContentPanel.height;
        
        var scale = axis.scale;
        scale.min  = 0;
        scale.max  = size; 
        scale.size = size; // original size
        
        var axisOffset = axis.option('Offset');
        if(axisOffset > 0){
            var rOffset = size * axisOffset;
            scale.min += rOffset;
            scale.max -= rOffset;
            scale.offset = rOffset;
            scale.offsetSize = scale.max - scale.min;
        } else {
            scale.offset = 0;
            scale.offsetSize = scale.size;
        }
        
        if(scale.type === 'Discrete'){
            if(scale.domain().length > 0){ // Has domain? At least one point is required to split.
                var bandRatio = this.options.panelSizeRatio || 0.8;
                scale.splitBandedCenter(scale.min, scale.max, bandRatio);
            }
        } else {
            if(scale.type === 'Continuous' && axis.option('DomainRoundMode') === 'tick'){
                var axisPanel = this.axesPanels[axis.id];
                if(axisPanel){
                    // Domain rounding
                    // Commit the scale's domain to the axis calculated ticks domain
                    var ticks = axisPanel.getTicks();
                    var tickCount = ticks && ticks.length;
                    if(tickCount){
                        scale.domain(ticks[0], ticks[tickCount - 1]);
                    }
                }
            }
            
            scale.range(scale.min, scale.max);
        }
        
        if(pvc.debug >= 4){
            pvc.log("Scale: " + JSON.stringify(def.copyOwn(scale)));
        }
        
        return scale;
    },

    /*
     * Obtains the chart's visible data
     * grouped according to the charts "main grouping".
     * 
     * @param {string|string[]} [dataPartValues=null] The desired data part value or values.
     * 
     * @type pvc.data.Data
     */
    _getVisibleData: function(dataPartValues){
        var key = '' + (dataPartValues || ''), // relying on Array.toString
            data = def.getOwn(this._visibleDataCache, key);
        if(!data) {
            data = this._createVisibleData(dataPartValues);
            
            (this._visibleDataCache || (this._visibleDataCache = {}))
                [key] = data;
        }
        
        return data;
    },

    /*
     * Creates the chart's visible data
     * grouped according to the charts "main grouping".
     *
     * <p>
     * The default implementation groups data by series visual role.
     * </p>
     *
     * @param {string|string[]} [dataPartValues=null] The desired data part value or values.
     *
     * @type pvc.data.Data
     * @protected
     * @virtual
     */
    _createVisibleData: function(dataPartValues){
        var partData = this._partData(dataPartValues);
        return this._serRole && this._serRole.grouping ?
                   this._serRole.flatten(partData, {visible: true}) :
                   partData;
    },
    
    _assertSingleContinuousValueRole: function(valueRole){
        if(!valueRole.grouping.isSingleDimension) {
            pvc.log("[WARNING] A linear scale can only be obtained for a single dimension role.");
        }
        
        if(valueRole.grouping.isDiscrete()) {
            pvc.log("[WARNING] The single dimension of role '{0}' should be continuous.", [valueRole.name]);
        }
    },
    
    /**
     * Gets the extent of the values of the specified axis' roles
     * over all datums of the visible data.
     * 
     * @param {pvc.visual.CartesianAxis} valueAxis The value axis.
     * @param {string|string[]} [dataPartValues=null] The desired data part value or values.
     * @type object
     *
     * @protected
     * @virtual
     */
    _getVisibleValueExtent: function(valueAxis, dataPartValues){
        var roles = valueAxis.roles;
        if(roles.length === 1){
            // Most common case is faster
            return this._getVisibleRoleValueExtent(valueAxis, roles[0], dataPartValues);
        }

        return def.query(roles)
                .select(function(role){
                    return this._getVisibleRoleValueExtent(valueAxis, role, dataPartValues);
                }, this)
                .reduce(this._unionReduceExtent, null);
    },

    /**
     * Could/Should be static
     */
    _unionReduceExtent: function(result, range){
        if(!result) {
            if(!range){
                return null;
            }

            result = {min: range.min, max: range.max};
        } else if(range){
            if(range.min < result.min){
                result.min = range.min;
            }

            if(range.max > result.max){
                result.max = range.max;
            }
        }

        return result;
    },

    /**
     * Gets the extent of the values of the specified role
     * over all datums of the visible data.
     *
     * @param {pvc.visual.CartesianAxis} valueAxis The value axis.
     * @param {pvc.visual.Role} valueRole The role.
     * @param {string|string[]} [dataPartValues=null] The desired data part value or values.
     * @type object
     *
     * @protected
     * @virtual
     */
    _getVisibleRoleValueExtent: function(valueAxis, valueRole, dataPartValues){
        this._assertSingleContinuousValueRole(valueRole);

        if(valueRole.name === 'series') {
            /* not supported/implemented? */
            throw def.error.notImplemented();
        }

        var valueDimName = valueRole.firstDimensionName();
        var extent = this._getVisibleData(dataPartValues).dimensions(valueDimName).extent();
        return extent ? {min: extent.min.value, max: extent.max.value} : undefined;
    },
    
    /**
     * @virtual
     */
    _getVisibleValueExtentConstrained: function(axis, dataPartValues, min, max){
        var extent = {
                minLocked: false,
                maxLocked: false
            };
        
        if(min == null) {
            min = axis.option('FixedMin');
            if(min != null){
                extent.minLocked = true;
            }
        }
        
        if(max == null) {
            max = axis.option('FixedMax');
            if(max != null){
                extent.maxLocked = true;
            }
        }
        
        if(min == null || max == null) {
            var baseExtent = this._getVisibleValueExtent(axis, dataPartValues); // null when no data
            if(!baseExtent){
                return null;
            }
            
            if(min == null){
                min = baseExtent.min;
            }
            
            if(max == null){
                max = baseExtent.max;
            }
        }
        
        extent.min = min;
        extent.max = max;
        
        return extent;
    }
}, {
    defaultOptions: pvc.visual.CartesianAxis.createAllDefaultOptions({
        showAllTimeseries: false,

        /* Percentage of occupied space over total space in a discrete axis band */
        panelSizeRatio: 0.9,

        // Indicates that the *base* axis is a timeseries
        timeSeries: false,
        timeSeriesFormat: "%Y-%m-%d",
        
        originIsZero:  undefined,
        
        orthoFixedMin: undefined,
        orthoFixedMax: undefined,

        useCompositeAxis: false,

        /* Non-standard axes options and defaults */
        showXScale: true,
        showYScale: true,
        
        xAxisPosition: "bottom",
        yAxisPosition: "left",

        secondAxisIndependentScale: false,
        secondAxisColor: "blue"
    })
});
