var Xcharter;
( function(mod){
    'use strict';
	var VERSION = "1.00";

	//Inner Class
	var TimePixelPositioner = (function(){
		function TimePixelPositioner(startBPM, BPMMarkerPositions, barLength, options) {
            this.currentStartBPM = startBPM;
            this.currentBPMMarkerPosArray = BPMMarkerPositions ? BPMMarkerPositions : [];
            this.currentStartPixelPosition = 0.0;
            this.currentBarIndex = 0;
            
            //Default optional
            this.currentBarLength = barLength ? barLength : 1.0;
            this.baseBpm = 180.0;
 		    this.scaleFactor = 2.0;

            //Need to compute with BPMMarkerPositions
            this.currentBarLines = linesInBar(barLength);
            this.currentBarPixelLength = this.computeChipPixelPositionInBar(this.currentBarLines);

            //
            if(options){
            	if(options.baseBpm){
            		this.baseBpm = options.baseBpm;
            	}
            	if(options.scaleFactor){
            		this.scaleFactor = options.scaleFactor;
            	}
            }
        }

        //Lines per Bar of length 1
		//Also means pixels per bar of length 1 at BPM 180
		var BASELINES = 192;
		var BASEBARLENGTH = 1.0;
        var QUARTERLINESPACING = 48;
        TimePixelPositioner.prototype.currentBarQuarterLinePositions = function(){
        	var quartLinePosArray = [];
        	var currQuarterLinePos = QUARTERLINESPACING;
        	while(currQuarterLinePos < this.currentBarLines){
        		quartLinePosArray.push( this.getAbsoluteChipPosition(currQuarterLinePos) );
        		currQuarterLinePos += QUARTERLINESPACING;
        	}
        	return quartLinePosArray;
        };

        TimePixelPositioner.prototype.currentBarStartPos = function() {
        	return this.currentStartPixelPosition;
        };

        TimePixelPositioner.prototype.currentBarIndex = function() {
        	return this.currentBarIndex;
        };

        TimePixelPositioner.prototype.moveToNextBar = function(BPMMarkerPositions, barLength) {
        	//Update startBPM
        	if(this.currentBPMMarkerPosArray.length > 0){
        		this.currentStartBPM = this.currentBPMMarkerPosArray[this.currentBPMMarkerPosArray.length - 1].bpm;
        	}

        	//Update startPixelPosition
        	this.currentStartPixelPosition += this.currentBarPixelLength;

        	//Update bpmMarkerArray
        	this.currentBPMMarkerPosArray = BPMMarkerPositions;

        	this.currentBarLength = barLength;

        	this.currentBarLines = linesInBar(barLength);
            this.currentBarPixelLength = this.computeChipPixelPositionInBar(this.currentBarLines);

            this.currentBarIndex++;
        };

        //Limited to range within bar
        TimePixelPositioner.prototype.getAbsoluteChipPosition = function(linePos) {
        	if(linePos < 0 || linePos >= this.currentBarLines){
        		console.error('computeChipPixelPositionInBar(): linePos is out of numerical range [0,'+(this.currentBarLines-1)+'] of current bar');
        		return null;
        	}

        	return this.currentStartPixelPosition + this.computeChipPixelPositionInBar(linePos);
        };

        /*
        This function does not limit linePos to within range of bar. Useful for computing relative positions and 
        compute pixel length of current bar
        */
        TimePixelPositioner.prototype.computeChipPixelPositionInBar = function(linePos) {
        	//E.g. bpmMarkerPositionsArray
        	// var bpmMarkerPositions = [
        	// 	{bpm: 90, linePos: 48},
        	// 	{bpm: 120, linePos: 144}
        	// ];

        	if((typeof linePos) !== 'number'){
        		//
        		console.error('computeChipPixelPositionInBar(): linePos is not a number');
        		return null;
        	}

        	if(linePos === 0){
        		return 0.0;
        	}

        	var bpmArray = this.currentBPMMarkerPosArray;
        	var pixelPos = 0.0;
        	var lowerBound = 0;
        	var currBPM = this.currentStartBPM;

        	for (var i = 0; i < bpmArray.length; i++) {
        		
        		if(linePos > lowerBound && linePos <= bpmArray[i].linePos){
        			return pixelPos + this.pixelLengthOfLines(linePos - lowerBound, currBPM);
        		}
        		pixelPos += this.pixelLengthOfLines(bpmArray[i].linePos - lowerBound, currBPM);

        		//Update for next section
        		currBPM = bpmArray[i].bpm;
        		lowerBound = bpmArray[i].linePos;
        	};

        	//Compute for position after last bpm marker
        	pixelPos += this.pixelLengthOfLines(linePos - lowerBound, currBPM);

        	return pixelPos;
        };


        //barLength is 1.0 for standard 4/4 bar
		var linesInBar = function(barLength){
			return Math.floor(BASELINES * barLength / BASEBARLENGTH);
		};
		//mod.linesInBar = linesInBar;

		TimePixelPositioner.prototype.pixelLengthOfLines = function(lineCount, bpm){
			return this.scaleFactor * this.baseBpm / bpm * lineCount;
		};

		//Return the constructor right at the end
		return TimePixelPositioner;

	})();
	mod.TimePixelPositioner = TimePixelPositioner;

	//Calculate actual chip position
	var MINIMUM_PAGE_COUNT = 5;
	var X_OFFSET = 10; 
	var Y_OFFSET = -40;
	var Y_MARGIN = 5;
	var BASE_Y_PIXELS_PERPAGE = 1920;
	var BASE_X_PIXELS_PERPAGE = 300;
	var INFO_SECTION_HEIGHT = 160;
	var DEFAULT_CHIP_HEIGHT = 4;
	var DEFAULT_CHIP_WIDTH = 19;
	var LANENAMES = [
		"LC","HH","LP","SD","HT","BD","LT","FT","RC","RD"
	];
	var TITLE_UNDERLINE_POS = {
		x: X_OFFSET,
		y: 90
	};

	var TITLE_POS = {
		x: X_OFFSET + 47,
		y: 92
	};	
	var DEFAULT_CHIP_RELATIVE_X_POSITION_MAP = {
		"BPM":0,
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
		"BARNUM":260
	};
	var BARWIDTH = 199.5;

	var ChipPositioner = (function(){
		function ChipPositioner(chipPosMap, options){
			this.chipPosMap = chipPosMap;
			this.heightPerPage = BASE_Y_PIXELS_PERPAGE;

			if(options){
				if(options.pageHeight){
					if(options.pageHeight >= 192 && options.pageHeight <= 169*192){
						this.heightPerPage = options.pageHeight;
					}
				}
			}

		};

		ChipPositioner.prototype.computeChipChartPosition = function(chipLabel, timePixelPosition){
			//Compute Y position
			var pageIndex = Math.floor(timePixelPosition / this.heightPerPage);
			var remainderPos = timePixelPosition % this.heightPerPage;
			var YPos = Y_OFFSET + this.heightPerPage + INFO_SECTION_HEIGHT - remainderPos;

			//Compute X position
			var XPos = X_OFFSET + BASE_X_PIXELS_PERPAGE*pageIndex + this.chipPosMap[chipLabel];

			return {x: XPos, y:YPos, pageCount: pageIndex+1};
		};

		ChipPositioner.prototype.computeBarLinePosition = function(timePixelPosition){
			//Compute Y position
			var pageIndex = Math.floor(timePixelPosition / this.heightPerPage);
			var remainderPos = timePixelPosition % this.heightPerPage;
			var YPos = Y_OFFSET + this.heightPerPage + INFO_SECTION_HEIGHT - remainderPos;

			//Compute X Position
			var XPos = X_OFFSET + BASE_X_PIXELS_PERPAGE*pageIndex + this.chipPosMap['LC']-1;

			return {x: XPos, y:YPos, pageCount: pageIndex+1};
		};

		ChipPositioner.prototype.computeFramePosition = function(pageIndex){
			//Compute Y position
			var YPos = Y_OFFSET + this.heightPerPage + INFO_SECTION_HEIGHT - this.heightPerPage - Y_MARGIN;

			//Compute X Position
			var XPos = X_OFFSET + BASE_X_PIXELS_PERPAGE*pageIndex + this.chipPosMap['LeftBorder'];

			return {x: XPos, y:YPos, pageCount: pageIndex+1};
		};

		ChipPositioner.prototype.computeInnerLaneLinePosition = function(chipLabel, pageIndex){
			if(!this.chipPosMap[chipLabel]){
				console.error('This chiplabel ' + chiplabel + ' does not exist');
			}

			//Compute Y position
			var YPos = Y_OFFSET + this.heightPerPage + INFO_SECTION_HEIGHT - this.heightPerPage;
			//Compute X Position
			var XPos = X_OFFSET + BASE_X_PIXELS_PERPAGE*pageIndex + this.chipPosMap[chipLabel] - 1;

			return {x: XPos, y:YPos, pageCount: pageIndex+1};

		};

		ChipPositioner.prototype.computeBorderLinePosition = function(isTop, pageIndex){

			var YPos = Y_OFFSET + this.heightPerPage + INFO_SECTION_HEIGHT;
			if(isTop){
				YPos -= this.heightPerPage;
			}
			var XPos = X_OFFSET + BASE_X_PIXELS_PERPAGE*pageIndex + this.chipPosMap['LC']-1;

			return {x: XPos, y:YPos, pageCount: pageIndex+1};

		};

		return ChipPositioner;
	})();
	//mod.ChipPositioner = ChipPositioner;

	//Plotter requires fabric.js
	if(!fabric){
		console.error('fabric.js library must be loaded first!');
		return;
	}

	var Plotter = (function(){
		function Plotter(){
			this.cpositioner = new ChipPositioner(DEFAULT_CHIP_RELATIVE_X_POSITION_MAP);
			this.heightPerPage = BASE_Y_PIXELS_PERPAGE;
			var canvas = new fabric.StaticCanvas('c1', {
				height: this.heightPerPage + INFO_SECTION_HEIGHT,
				width: MINIMUM_PAGE_COUNT*BASE_X_PIXELS_PERPAGE + X_OFFSET*2,
				renderOnAddRemove: false
			});
			canvas.setBackgroundColor("rgba(0,0,0,1)", canvas.renderAll.bind(canvas));

			this.canvas = canvas;
			this.currentPageCount = 0;
			this.currentTitleUnderline = null;
			
			var self = this;

			//Internal private function
			var checkPageDrawing = function(chipPosition){
				//Draw more page frames if page count of chip is more than current page count
				//Update currentPageCount value thereafter
				var pageCountBeforeUpdate = self.currentPageCount;
				if(self.currentPageCount < chipPosition.pageCount){
					var pageDiffCount = chipPosition.pageCount - self.currentPageCount;
					for (var i = 0; i < pageDiffCount; i++) {
						//console.log('(Private) Draw page frames for page index: ' + (self.currentPageCount+i));
						drawPageFrame(self.currentPageCount + i);
					};
					self.currentPageCount = chipPosition.pageCount;
					drawTitleUnderLine(self.currentPageCount);
				}

				//Increase the width of canvas when required
				if(self.currentPageCount > MINIMUM_PAGE_COUNT && self.currentPageCount>pageCountBeforeUpdate){
					self.canvas.setWidth(self.currentPageCount*BASE_X_PIXELS_PERPAGE + X_OFFSET*2);
					//drawTitleUnderLine(self.currentPageCount);
					//self.canvas.renderAll();
				}
			};

			this._checkPageDrawing = function(chipPosition){
				checkPageDrawing(chipPosition);
			};

			var drawPageFrame = function(pageIndex){
				
				//Outer Frame
				var FramePos = self.cpositioner.computeFramePosition(pageIndex);
				var frame = LinesMap['Frame'].clone().setHeight(self.heightPerPage+Y_MARGIN*2).setLeft(FramePos.x).setTop(FramePos.y);

				self.canvas.add(frame);
				//self.canvas.moveTo(frame, -10);

				//Draw inner lane lines
				var lanesNameArray = LANENAMES;
				//var laneLines = [];
				for (var i = 0; i < lanesNameArray.length; i++) {
					var LanePos = self.cpositioner.computeInnerLaneLinePosition(lanesNameArray[i], pageIndex);
					var lane = LinesMap['InnerPageVerticalLine'].clone().setLeft(LanePos.x).setTop(LanePos.y).setWidth(0
						).setHeight(self.heightPerPage);
					self.canvas.add(lane);
				};

				//Draw border lines
				var borderTopPos = self.cpositioner.computeBorderLinePosition(true, pageIndex);
				var lineWidth = BARWIDTH;
				var borderLineTop = LinesMap['BorderLine'].clone().setLeft(borderTopPos.x).setTop(borderTopPos.y)
								.setWidth(lineWidth).setHeight(0);

				var borderBottomPos = self.cpositioner.computeBorderLinePosition(false, pageIndex);
				var borderLineBottom = LinesMap['BorderLine'].clone().setLeft(borderBottomPos.x).setTop(borderBottomPos.y)
								.setWidth(lineWidth).setHeight(0);

				self.canvas.add(borderLineTop);
				self.canvas.add(borderLineBottom);

			};

			var drawTitleUnderLine = function(pageCount){
				var actualPageCount = MINIMUM_PAGE_COUNT;
				if(self.currentTitleUnderline){
					if(pageCount > MINIMUM_PAGE_COUNT){
						self.canvas.remove(self.currentTitleUnderline);
						actualPageCount = pageCount;
						//and continue to draw	
					}
					else{
						return;
					}
				}

				var lineWidth = BASE_X_PIXELS_PERPAGE*actualPageCount;
				self.currentTitleUnderline = LinesMap["TitleUnderLine"].clone().setLeft(TITLE_UNDERLINE_POS.x).setTop(TITLE_UNDERLINE_POS.y)
										.setWidth(lineWidth);
				self.canvas.add(self.currentTitleUnderline);

			};			
		};

		var ChipMap = {
			"BPM":new fabric.Text('000.00',{
				// backgroundColor: 'black',
				fill: '#ffffff',
				fontSize: 12,
				originY: 'center'
			}),
			"LC":new fabric.Rect({
			  fill: '#ec4f94',
			  width: DEFAULT_CHIP_WIDTH,
			  height: DEFAULT_CHIP_HEIGHT,
			  originY: 'center'
			}),
			"HH":new fabric.Rect({
			  fill: '#00ffff',
			  width: DEFAULT_CHIP_WIDTH,
			  height: DEFAULT_CHIP_HEIGHT,
			  originY: 'center'
			}),
			"LP":new fabric.Rect({
			  fill: '#e7baff',
			  width: DEFAULT_CHIP_WIDTH,
			  height: DEFAULT_CHIP_HEIGHT,
			  originY: 'center'
			}),
			"SD":new fabric.Rect({
			  fill: '#fff040',
			  width: DEFAULT_CHIP_WIDTH,
			  height: DEFAULT_CHIP_HEIGHT,
			  originY: 'center'
			}),
			"HT":new fabric.Rect({
			  fill: '#00ff00',
			  width: DEFAULT_CHIP_WIDTH,
			  height: DEFAULT_CHIP_HEIGHT,
			  originY: 'center'
			}),
			"BD":new fabric.Rect({
			  fill: '#a580ff',
			  width: DEFAULT_CHIP_WIDTH,
			  height: DEFAULT_CHIP_HEIGHT,
			  originY: 'center'
			}),
			"LT":new fabric.Rect({
			  fill: '#ff0000',
			  width: DEFAULT_CHIP_WIDTH,
			  height: DEFAULT_CHIP_HEIGHT,
			  originY: 'center'
			}),
			"FT":new fabric.Rect({
			  fill: '#fea101',
			  width: DEFAULT_CHIP_WIDTH,
			  height: DEFAULT_CHIP_HEIGHT,
			  originY: 'center'
			}),
			"RC":new fabric.Rect({
			  fill: '#00ccff',
			  width: DEFAULT_CHIP_WIDTH,
			  height: DEFAULT_CHIP_HEIGHT,
			  originY: 'center'
			}),
			"RD":new fabric.Rect({
			  fill: '#5a9cf9',
			  width: DEFAULT_CHIP_WIDTH,
			  height: DEFAULT_CHIP_HEIGHT,
			  originY: 'center'
			}),
			"BARNUM":new fabric.Text('000',{
				// backgroundColor: 'black',
				fill: '#ffffff',
				fontSize: 16,
				originY: 'center'
			})

		};

		var LinesMap = {
			"BarLine":  new fabric.Line([0,0,0,0],{
		        stroke: "#ffffff",
		        strokeWidth: 1,
			}),
			"QuarterLine":  new fabric.Line([0,0,0,0],{
		        stroke: "#4e4e4e",
		        strokeWidth: 1,
			}),
			"InnerPageVerticalLine": new fabric.Line([0,0,0,0],{
				stroke: "#303030",
				strokeWidth: 1,
			}),
			"BorderLine": new fabric.Line([0,0,0,0],{
				stroke: "#2e2e2e",
				strokeWidth: 1,
			}),
			"TitleUnderLine": new fabric.Line([ 0, 0, 0, 0 ],{
				stroke: "#ffffff",
		        strokeWidth: 2,
			}),			 
			"Frame": new fabric.Rect({
				// opacity: 0.5,
				width: DEFAULT_CHIP_RELATIVE_X_POSITION_MAP['RightBorder'] - DEFAULT_CHIP_RELATIVE_X_POSITION_MAP['LeftBorder'],
				//height: BASE_Y_PIXELS_PERPAGE+Y_MARGIN*2,
				stroke: "#ffffbb",
				strokeWidth: 2
			})
		};

		Plotter.prototype.drawChartInfo = function(chartInfo){
			/*
				chartInfo is an object with properties:
				- title: Song title in English and/or Japanese Characters
				- level: 3 digits or 2 digits
				- bpm: The song LABELED BPM
				- noteCount: Number of notes in this song
			*/
			var title = new fabric.Text(chartInfo.title,{
				originY: 'bottom',
				left: TITLE_POS.x, top: TITLE_POS.y+3,
				fill: '#ffffff',
				fontSize: 30,
				fontFamily: 'Arial'
			});
			
			var default_LevelPosX = X_OFFSET + 2*BASE_X_PIXELS_PERPAGE;
			var level_posx = TITLE_POS.x + title.width + 10;
			level_posx = level_posx > default_LevelPosX ? level_posx : default_LevelPosX;
			var levelBPMInfo = new fabric.Text("Level: "+chartInfo.level+"   BPM: " + chartInfo.bpm + "   Notes: " + chartInfo.noteCount,{
				originY: 'bottom',
				left: level_posx, top: TITLE_POS.y,
				fill: '#ffffff',
				fontSize: 22,
				fontFamily: 'Arial'
			});

			this.canvas.add(title);
			this.canvas.add(levelBPMInfo);
		};

		Plotter.prototype.plotBarLine = function(lineType, timePixelPosition){
			if(!LinesMap[lineType]){
				console.error('Bar Line Type '+lineType+' does not exist');
				return;
			}

			var LinePos = this.cpositioner.computeBarLinePosition(timePixelPosition);

			if(!LinePos){
				console.error('Error computing line position');
				return;
			}

			this._checkPageDrawing(LinePos);

			var newBarLine = LinesMap[lineType].clone().setLeft(LinePos.x).setTop(LinePos.y)
			.setWidth(BARWIDTH).setHeight(0);

			//newBarLine.setCoords();

			this.canvas.add(newBarLine);
			//this.canvas.renderAll();

			//Set z-index to -1
			//this.canvas.moveTo(newBarLine, -1);

			return LinePos;

		};

		Plotter.prototype.plotBPMMarker = function(bpmValue, timePixelPosition){
			var chipPos = this.cpositioner.computeChipChartPosition("BPM", timePixelPosition);

			if(!chipPos){
				console.error('Error computing chip chart position');
				return;
			}

			this._checkPageDrawing(chipPos);

			var bpmLabel = bpmValue.toFixed(2);

			var newBarNum = ChipMap["BPM"].clone().setText(bpmLabel).setLeft(chipPos.x).setTop(chipPos.y);
			this.canvas.add(newBarNum);

			return chipPos;
		};

		Plotter.prototype.plotBarNumber = function(barIndex, timePixelPosition){
			if(barIndex < 0 || barIndex >= 999){
				console.error('barIndex is out of range [000,999]');
			}

			var chipPos = this.cpositioner.computeChipChartPosition("BARNUM", timePixelPosition);

			if(!chipPos){
				console.error('Error computing chip chart position');
				return;
			}

			this._checkPageDrawing(chipPos);			

			//
			var barIndexLabel;
			if(barIndex < 10){
				barIndexLabel = "00" + barIndex;
			}
			else if(barIndex < 100){
				barIndexLabel = "0" + barIndex;
			}
			else{
				barIndexLabel = "" + barIndex;
			}


			var newBarNum = ChipMap["BARNUM"].clone().setText(barIndexLabel).setLeft(chipPos.x).setTop(chipPos.y);
			this.canvas.add(newBarNum);

			return chipPos;
		};

		Plotter.prototype.plotChip = function(chipLabel, timePixelPosition) {
			// body...
			if(!ChipMap.hasOwnProperty(chipLabel)){
				console.warn('Chipmap does not have chip with label ' + chipLabel);
				return;
			}

			var chipPos = this.cpositioner.computeChipChartPosition(chipLabel, timePixelPosition);

			if(!chipPos){
				console.error('Error computing chip chart position');
				return;
			}

			this._checkPageDrawing(chipPos);

			//Clone and place the chip
			var newChip = ChipMap[chipLabel].clone().setLeft(chipPos.x).setTop(chipPos.y);

			this.canvas.add(newChip);

			return chipPos;
		};

		Plotter.prototype.updateRender = function(){
			var createdByText = new fabric.Text("Created by DtxCharter "+VERSION,{
				originY: 'bottom',
				originX: 'right',
				left: this.canvas.getWidth()-X_OFFSET, top: TITLE_POS.y,
				fill: '#7f7f7f',
				fontSize: 12,
				fontFamily: 'Arial'
			});
			this.canvas.add(createdByText);

			this.canvas.renderAll();
		};

		Plotter.prototype.clear = function(options){
			if(options){
				if(options.pageHeight){
					if(options.pageHeight >= 192 && options.pageHeight <= 169*192){
						this.heightPerPage = options.pageHeight;
						this.cpositioner = new ChipPositioner(DEFAULT_CHIP_RELATIVE_X_POSITION_MAP, options); 
					}
				}
			}

			//Reset the plotter to original state
			this.canvas.clear();
			this.canvas.setBackgroundColor('#000000', this.canvas.renderAll.bind(this.canvas));
			this.canvas.renderAll();
			this.canvas.setWidth(MINIMUM_PAGE_COUNT*BASE_X_PIXELS_PERPAGE + X_OFFSET*2);
			this.canvas.setHeight(this.heightPerPage + INFO_SECTION_HEIGHT);
			this.currentPageCount = 0;
			this.currentTitleUnderline = null;
		};


		return Plotter;
	})();
	mod.Plotter = Plotter;

})(Xcharter || (Xcharter={}));