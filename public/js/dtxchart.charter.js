/**
 * 
 */

var DtxChart = (function(mod){

    var CanvasEngine = mod.CanvasEngine;//Can be FabricJS, EaselJS or even raw Canvas API
    if(!CanvasEngine){
        console.error("CanvasEngine not loaded into DtxChart module! DtxChart.Charter will not render without a Canvas engine");
    }

    var DEFAULT_SCALE = 1.0;
    var MIN_SCALE = 1.0;
    var MAX_SCALE = 3.0;

    var DEFAULT_PAGE_HEIGHT = 1920;
    var MIN_PAGE_HEIGHT = 960;
    var MAX_PAGE_HEIGHT = 3840;

    var DEFAULT_PAGEPERCANVAS = 12;
    var MIN_PAGEPERCANVAS = 4;
    var MAX_PAGEPERCANVAS = 40;

    //A collection of width/height constants for positioning purposes. Refer to diagram for details 
    var DtxChartCanvasMargins = {
        "A": 180,//Info section height
        "B": 20,//Top margin of page
        "C": 30,//Left margin of chart
        "D": 30,//Right margin of chart
        "E": 20,//Bottom margin of page
        "F": 50,//Right margin of each page (Except the last page for each canvas)
        "G": 10,//Top/Bottom margin of Last/First line from the top/bottom border of each page
    };

    var DtxChartPageMarkerHorizontalPositions = {
        "Bpm":0,
		"LeftBorder":47,
		"LC":50,
		"HH":70,
		"LP":90,
		"SD":110,
		"HT":130,
		"BD":150,
		"LT":170,
		"FT":190,
		"RC":210,
		"RD":230,
		"RightBorder": 249,
		"BarNum":260,
        "width": 300
    };

    /** 
     * Constructor of Charter
     * Parameters:
     * dtxdata - DtxDataObject type
     * positionMapper - LinePositionMapper type
     * config - An object consist of following options:
     *   scale (Number): The vertical scaling factor for each page. Min value accepted is 1.0 and Max is 3.0. Default is 1.0
     *   pageHeight (Number): The height for each page in pixels. Min is 960 pixel, Max is 3840, Default is 1920 pixel
     *   pagePerCanvas (Number): The number of pages to be rendered per canvas element. Min 4 pages and max 20
    */
    function Charter(dtxdata, positionMapper, config){
        this._dtxdata = dtxdata;
        this._positionMapper = positionMapper;

        //
        this._scale = limit(typeof config.scale !== "number" ? config.scale : DEFAULT_SCALE, MIN_SCALE, MAX_SCALE);
        this._pageHeight = limit(typeof config.pageHeight !== "number" ? config.pageHeight : DEFAULT_PAGE_HEIGHT, MIN_PAGE_HEIGHT, MAX_PAGE_HEIGHT);
        this._pagePerCanvas = limit(typeof config.pagePerCanvas !== "number" ? config.pagePerCanvas : DEFAULT_PAGEPERCANVAS, MIN_PAGEPERCANVAS, MAX_PAGEPERCANVAS);

        this._chartSheets = [];
        this._pageCount = 0;
        this._heightPerCanvas = 0;
    }

    /**
     * 
     */
    Charter.prototype.canvasRequired = function(){
        //Calculate the canvas required, including the width height of each canvas and number of pages per canvas

        //Find total number of pages required
        var chartLength = this._positionMapper.chartLength();
        var requiredPageCount = Math.ceil((chartLength * this._scale) / this._pageHeight);
        this._pageCount = requiredPageCount;

        var canvasCount = Math.ceil(requiredPageCount / this._pagePerCanvas);
        var pageInLastCanvas = requiredPageCount % this._pagePerCanvas;

        //Height required for all canvas
        var heightPerCanvas = this._pageHeight + DtxChartCanvasMargins.A + DtxChartCanvasMargins.B + DtxChartCanvasMargins.E + DtxChartCanvasMargins.G * 2;
        this._heightPerCanvas = heightPerCanvas;

        //Width required for all canvas and last canvas
        var widthPerCanvas = DtxChartCanvasMargins.C + 
            (DtxChartPageMarkerHorizontalPositions.width + DtxChartCanvasMargins.F) * this._pagePerCanvas + DtxChartCanvasMargins.D;
        
        var canvasInfo = [];
        for(var i=0; i < canvasCount; ++i ){
            //The last canvas has less pages if pageInLastCanvas is not zero so width needs to be calculated again
            if(pageInLastCanvas !== 0 && i === canvasCount - 1){
                var widthFinalCanvas = DtxChartCanvasMargins.C + 
            (DtxChartPageMarkerHorizontalPositions.width + DtxChartCanvasMargins.F) * pageInLastCanvas + DtxChartCanvasMargins.D;
                canvasInfo.push({
                    "pages": pageInLastCanvas,
                    "pageHeight": this._pageHeight,
                    "width": widthFinalCanvas,
                    "height": heightPerCanvas
                });
            }
            else{
                canvasInfo.push({
                    "pages": this._pagePerCanvas,
                    "pageHeight": this._pageHeight,
                    "width": widthPerCanvas,
                    "height": heightPerCanvas
                });
            }
        }

        return canvasInfo;
    };

    /**
     * Parameters:
     * canvasConfigArray - An array of canvasConfig object:
     *    canvasConfig is an object with following information:
     *    pages - 
     *    width - 
     *    height - 
     *    elementId - The id of the html5 canvas element
     *    backgroundColor - Color string of background color of canvas
     */
    Charter.prototype.setCanvasArray = function(canvasConfigArray){
        for(var i in canvasConfigArray){
            var chartSheet = new ChartSheet(canvasConfigArray[i]);
            this._chartSheets.push(chartSheet);
        }        
    };

    Charter.prototype.drawDTXChart = function(){

        //iterate through barGroups
        var barGroups = this._dtxdata;
        var positionMapper = this._positionMapper;

        for(var i in barGroups){

            var barInfo = barGroups[i];
            var absPosBarInfo = positionMapper[i];

            //TODO: Call the correct chartsheet instance to perform the drawing
        }

    };

    /**
     * Method: getPixelPositionOfLine
     * Parameter:
     * absolutePositon - The absolute position of the chart
     */
    Charter.prototype.getPixelPositionOfLine = function(absolutePositon){
        //Check if in range of chart
        if(typeof absolutePositon !== "number" || absolutePositon < 0 || absolutePositon >= this._positionMapper.chartLength()){
            console.error("absolutePositon is invalid or out of range");
            return;
        }

        //
        var pageIndex = Math.floor((absolutePositon * this._scale) / this._pageHeight);

        if(pageIndex < 0 || pageIndex >= this._pageCount){
            console.error("absolutePositon is out of range of the charter!");
            return;
        }

        //
        var sheetIndex = Math.floor( pageIndex / this._pagePerCanvas );
        var sheetPageIndex = pageIndex % this._pagePerCanvas;
        var remainingRelativePos = (absolutePositon * this._scale) % this._pageHeight;
        
        //Calculate X,Y position of line's leftmost point
        var actualPixHeightPosofLine = this._heightPerCanvas - DtxChartCanvasMargins.E - DtxChartCanvasMargins.G - remainingRelativePos;
        var actualPixWidthPosofLine = DtxChartCanvasMargins.C + 
        ( DtxChartPageMarkerHorizontalPositions.width + DtxChartCanvasMargins.F ) * sheetPageIndex;

        return {
            sheetIndex: sheetIndex,
            posX: actualPixWidthPosofLine,
            posY: actualPixHeightPosofLine
        };

    };

    /**
     * 
     */
    function ChartSheet(canvasConfig){
        
        this._canvasConfig = canvasConfig;
        if(CanvasEngine){
            this._canvasObject = CanvasEngine.createCanvas(canvasConfig);//The actual canvasObject
        }

        /**
         * var canvas = new fabric.StaticCanvas('c1', {
				backgroundColor: '#000000',
				height: this.heightPerPage + INFO_SECTION_HEIGHT,
				width: MINIMUM_PAGE_COUNT*BASE_X_PIXELS_PERPAGE + X_OFFSET*2,
				renderOnAddRemove: false
			});
         * 
         */

    }

    ChartSheet.prototype.addPageFrame = function(positionSize, drawOptions){
        if(CanvasEngine){
            CanvasEngine.drawRectangle.call(this, positionSize, drawOptions);
        }
    };

    ChartSheet.prototype.addChip = function(positionSize, drawOptions){
        if(CanvasEngine){
            CanvasEngine.drawRectangle.call(this, positionSize, drawOptions);
        }
    };

    ChartSheet.prototype.addLine = function(positionSize, drawOptions){
        if(CanvasEngine){
            CanvasEngine.drawLine.call(this, positionSize, drawOptions);
        }
    };

    ChartSheet.prototype.addText = function(positionSize, textOptions){
        if(CanvasEngine){
            CanvasEngine.drawText.call(this, positionSize, textOptions);
        }
    };

    /**
     * Helper functions
     */
    function limit(input, min, max){
        if(input > max){
            return max;
        }
        else if(input < min){
            return min;
        }
        else{
            return input;
        }
            
    }

    mod.Charter = Charter;
}(DtxChart || {} ));