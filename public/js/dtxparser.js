'use strict';

var DtxParser;
DtxParser = (function(){

	function DtxParser(settings){
		if(settings){
			this.settings = settings;
			//Do something with settings. Reserved for future use
		}
		this.originalText = "";

		//Initialize dtxObject
		this.dtxObject = {};
		this.dtxObject.chartInfo = {};
		this.dtxObject.bpmMarkers = {};
		this.dtxObject.barGroups = [];

		//
		this._largestBarIndex = -1;
		this._rawBarLines = {};

		//
		this._currBarLength = 1.0;

		var self = this;

		//Internal
		this.parseTextLine = function(line){
			
			var trimLine = trimExternalWhiteSpace(line);
			
			//Split the line into key value pair by first occurance of : or whitespace			
			//var keyValue = trimLine.split(/:(.+)?/,2);//Original working
			var keyValue = trimLine.split(/:(.+)?/,2);
			if(keyValue.length !== 2){
				keyValue = trimLine.split(/\s(.+)?/,2);
			}

			var key = keyValue[0].substring(1);
			var value = trimExternalWhiteSpace(keyValue[1]);
			
			if(parseFunctionMap.hasOwnProperty(key)){
				parseFunctionMap[key](self.dtxObject, value);
			}
			else if(key.indexOf('BPM') === 0){//Look for BPM Markers
				var bpmMarkerId = key.substring(3);
				var bpmValue = Number(value).toFixed(2);

				self.dtxObject.bpmMarkers[bpmMarkerId] = bpmValue;
			}
			else{//Look for Bar Numbered Keys
				var barNumString = key.substring(0, 3);
				var barNum = parseInt(barNumString);
				if(barNum >=0 || barNum <= 999){
					//
					var barLabel = key.substring(3);
					//console.log('Bar Num: ' + barNumString);
					if(barNum > self._largestBarIndex){
						self._largestBarIndex = barNum;
					}

					if(!self._rawBarLines[barNum]){
						self._rawBarLines[barNum] = {
							'Description': idString
						};
					}

					self._rawBarLines[barNum][barLabel] = value;
					
				}

			}

		}
	}

	var parseFunctionMap = {
		"TITLE": function(dtxObject, value){
			dtxObject.chartInfo.title = value;
		},
		"ARTIST": function(dtxObject, value){
			dtxObject.chartInfo.artist = value;
		},
		"BPM": function(dtxObject, value){
			dtxObject.chartInfo.bpm = value;
		},
		"DLEVEL": function(dtxObject, value){
			//console.log(value);
			var level = 0;
			if(value.length <= 2){
				level = (parseInt(value) / 10).toFixed(2);
				//console.log(level);
			}
			else if(value.length === 3){
				level = (parseInt(value) / 100).toFixed(2);
				//console.log(level);	
			}
			dtxObject.chartInfo.level = "" + level;
		}

	};

	//var HEADER = "; Created by DTXCreator 024";
	var SUPPORTED_HEADERS = ["; Created by DTXCreator 024",
	"; Created by DTXCreator 025(verK)",
	"; Created by DTXCreator 020",
	";Created by GDA Creator Professional Ver.0.10",
	";Created by GDA Creator Professional Ver.0.22"];

	var trimExternalWhiteSpace = function(inStr){
		if(typeof inStr === 'string'){
			return inStr.replace(/^\s+|\s+$/g, '');
		}
	};

	DtxParser.prototype.clear = function(){
		//
		this.dtxObject = {};
		this.dtxObject.chartInfo = {};
		this.dtxObject.bpmMarkers = {};
		this.dtxObject.barGroups = [];

		//
		this._largestBarIndex = -1;
		this._rawBarLines = {};
		this._currBarLength = 1.0;
	};

	DtxParser.prototype.parseDtxText = function(dtxText) {
		this.originalText = dtxText;
		var lines = dtxText.split('\n');

		//
		if(lines.length === 0){
			console.error('Fail to parse: File is empty!');
			return;
		}

		var trimLine = trimExternalWhiteSpace(lines[0]);
		
		//Check first line against any of the supported header
		var headerCheckPassed = false;
		for (var i = SUPPORTED_HEADERS.length - 1; i >= 0; i--) {
			if(trimLine === SUPPORTED_HEADERS[i]){
				headerCheckPassed = true;
				break;
			}
		};
		//if(HEADER !== trimLine){
		if(!headerCheckPassed){	
			console.error('Fail to parse: Header not supported');
			return;
		}

		//Start processing all valid lines
		for (var i = 1; i < lines.length; i++) {
			if(lines[i].length > 0 && lines[i][0]==='#')
			{
				this.parseTextLine(lines[i]);
			}
		};

		//console.log(this._rawBarLines);
		//console.log(this._largestBarIndex);

		//Further decode rawBarLines
		for (var i = 0; i <= this._largestBarIndex; i++) {
			//console.log(this._rawBarLines[i]);
			var barGroup = {"barLength": this._currBarLength,
							 bpmMarkerArray: [],
							 showHideLineMarkerArray: [],
							 noteCount: 0
						   };
			if(this._rawBarLines[i]){
				barGroup = this._parseBarGroup(this._rawBarLines[i]);
			}
			this.dtxObject.barGroups.push(barGroup);
		};

		//Final step, compute note count and save in chartInfo
		var totalNoteCount = 0;
		for (var i = 0; i < this.dtxObject.barGroups.length; i++) {
			totalNoteCount += this.dtxObject.barGroups[i].noteCount;
		};
		this.dtxObject.chartInfo.noteCount = totalNoteCount;

		return true;
	};

	DtxParser.prototype._parseBarGroup = function(barLines){
		if(!barLines['Description'] || barLines['Description'] !== idString){
			return;
		}

		var barGroup = {};
		
		//Handle Bar Length change first
		if(barLines.hasOwnProperty(DtxBarLabelMap.BAR_LENGTH_CHANGE_LABEL)){
			//Check for sensible values
			var possibleBarLength = Number(barLines[DtxBarLabelMap.BAR_LENGTH_CHANGE_LABEL]);
			//DtxCreator actually allows for up to 100 but not practical
			if(possibleBarLength >= 1/192 && possibleBarLength < 10.0){
				this._currBarLength = possibleBarLength;
			}
			else{
				this._currBarLength = 1.0;
			}
		}
		var lineCountInCurrentBar = Math.floor(192 * this._currBarLength / 1.0);
		barGroup["barLength"] = this._currBarLength;
		barGroup.bpmMarkerArray = [];
		barGroup.showHideLineMarkerArray = [];
		barGroup.noteCount = 0;

		//Handle bpm change markers
		if(barLines.hasOwnProperty(DtxBarLabelMap.BPM_CHANGE_LABEL)){
			//Set current bar length
			var markerPositionArray = decodeBarline( barLines[DtxBarLabelMap.BPM_CHANGE_LABEL], lineCountInCurrentBar);
			//console.log(markerPositionArray);

			//This assumes markerPositionArray is already sorted in ascending linePos order
			for (var i = 0; i < markerPositionArray.length; i++) {
				var bpmMarkerLabel = markerPositionArray[i]["label"];
				var bpmValue = Number(this.dtxObject.bpmMarkers[bpmMarkerLabel]);

				var linePosValue = markerPositionArray[i]["linePos"];
				barGroup.bpmMarkerArray.push({bpm:bpmValue, linePos:linePosValue});
			};
		}

		//Handle show/hide bar line flags
		if(barLines.hasOwnProperty(DtxBarLabelMap.LINE_SHOW_HIDE_LABEL)){
			var flagPositionsArray = decodeBarline( barLines[DtxBarLabelMap.LINE_SHOW_HIDE_LABEL], lineCountInCurrentBar);
			
			for (var i = 0; i < flagPositionsArray.length ; i++) {
				var flagValue = flagPositionsArray[i]["label"] === "02" ? false : true;
				var linePosValue = flagPositionsArray[i]["linePos"];
				barGroup.showHideLineMarkerArray.push({flag:flagValue, linePos:linePosValue});
			};
		}

		//console.log('Line Count: ' + lineCountInCurrentBar);

		for (var prop in barLines) {
			if(prop === 'Description'){
				continue;
			}

		    if (barLines.hasOwnProperty(prop) && DtxBarLabelToChipLaneLabelMap.hasOwnProperty(prop)) {
		        var chipPosArray = decodeBarline(barLines[prop], lineCountInCurrentBar);
		        if(barGroup[ DtxBarLabelToChipLaneLabelMap[prop] ]){
		        	for (var i = 0; i < chipPosArray.length; i++) {
		        		barGroup[ DtxBarLabelToChipLaneLabelMap[prop] ].push(chipPosArray[i]);
		        	};		        	
		        }
		        else{
		        	barGroup[ DtxBarLabelToChipLaneLabelMap[prop] ] = chipPosArray;
		        }
		        //NOTE: barGroup[chipLabel] may not be sorted in ascending LinePos order because multiple chip types can fall in the same lane
		        barGroup.noteCount += chipPosArray.length;
		    }
		}

		return barGroup;
	};

	var decodeBarline = function(barline, totalLineCount){
		//console.log(barline);
		//console.log('Line count: ' + totalLineCount);

		//Split barline into array of 2 characters
		var chipStringArray = barline.match(/.{1,2}/g);
		//console.log(chipStringArray);
		var chipPosArray = [];

		for (var i = 0; i < chipStringArray.length; i++) {
			if(chipStringArray[i] !== '00'){
				var linePos = i*totalLineCount/chipStringArray.length;
				var item = {"linePos":linePos, "label":chipStringArray[i]};
				chipPosArray.push(item);
			}
		};

		return chipPosArray;
	};

	var idString = "dtxBarLine";
	/*
	02 - Bar Length Change (For whole bar only)
	01 - BGM
	08 - BPM
	1A - LC 
	11 - HH
	18 - HH (open)
	1C - LP (HH) (One version of DtxCreator does not have 1C)
	1B - LP (Bass)
	12 - SD
	14 - HT
	13 - BD
	15 - LT
	17 - FT
	16 - RC
	19 - RD

	*/
	var DtxBarLabelMap = {
		BAR_LENGTH_CHANGE_LABEL: "02",
		LINE_SHOW_HIDE_LABEL: "C2",
		BPM_CHANGE_LABEL: "08"
	};

	var DtxBarLabelToChipLaneLabelMap = {
		//New DTX Creator uses these codes
		"1A":"LC",
		"11":"HH",
		"18":"HH",
		"1C":"LP",
		"1B":"LP",
		"12":"SD",
		"14":"HT",
		"13":"BD",
		"15":"LT",
		"17":"FT",
		"16":"RC",
		"19":"RD",
		//Old GDA uses the label mostly as is
		"SD":"SD",
		"BD":"BD",
		"CY":"RC",
		"HT":"HT",
		"LT":"LT",
		"FT":"FT",
		"HH":"HH"
	};

	DtxParser.DtxBarLaneNames = [
		"LC",
		"HH",
		"LP",
		"SD",
		"HT",
		"BD",
		"LT",
		"FT",
		"RC",
		"RD"
	];

	return DtxParser;
})();
