'use strict';

$(document).ready(function(){
	
	if (window.File && window.FileReader && window.FileList && window.Blob) {
	  console.log('Dtx Chart Drawing ready');
	} 
	else {
	  alert('The File APIs are not fully supported by your browser.');
	  //Put some message html tags on page
	  return;
	}

	//Fix the encoding to Japanese for now
	var encoding = "Shift-JIS";

	//
	var currDtxObject = null;

	// create a wrapper around native canvas element (with id="c1")
	$('#Open').click(function(e){
		$('#openFile').trigger('click');
	});
	
	var plotter = new Xcharter.Plotter();
	
	$('#Draw').click(function(e){
		if(currDtxObject){
			var scaleFactor = Number($('#SelectScaleFactor').val());
			var pageHeight = Number($('#SelectPageHeight').val());
			drawDtxChart(currDtxObject, plotter, scaleFactor, pageHeight);
		}		
	});

	$('#Clear').click(function(e){
		plotter.clear();
		$('#openFile').val("");
		currDtxObject = null;
	});

	$('#openFile').change(function(e){
		//console.log(e);
		
		var f = e.target.files[0];
		if(f){
			var r = new FileReader();
			r.onload = function(e) { 
				var contents = e.target.result;
				//console.log(contents);

				//Parse contents and create dtx-object from it
				var dtx_parser = new DtxParser();
				var status = dtx_parser.parseDtxText(contents);

				if(status){
					//Draw based on loaded dtxObject
					var scaleFactor = parseFloat($('#SelectScaleFactor').val());
					var pageHeight = Number($('#SelectPageHeight').val());
					currDtxObject = dtx_parser.dtxObject;
					console.log(currDtxObject);
					drawDtxChart(currDtxObject, plotter, scaleFactor, pageHeight);	
				}
			}
			r.readAsText(f,encoding);
		}

	});
	
});

var drawDtxChart = function(dtxObject, plotter, scaleFactor, pageHeight){
	plotter.clear({pageHeight:pageHeight});
	plotter.drawChartInfo(dtxObject.chartInfo);

	if(dtxObject.barGroups.length <= 0){
		console.log('Nothing to chart so early exit');
		return;
	}

	var startBpm = parseFloat(dtxObject.chartInfo.bpm);
	var startBpmMarkerArray = dtxObject.barGroups[0].bpmMarkerArray;
	var startBarLength = dtxObject.barGroups[0].barLength;

	//
	var positioner = new Xcharter.TimePixelPositioner(startBpm, startBpmMarkerArray, startBarLength,
		{baseBpm: startBpm, scaleFactor: scaleFactor});
	var currDrawBarLinesFlag = true;
	for (var i = 0; i < dtxObject.barGroups.length; i++) {		
		if(i > 0){
			positioner.moveToNextBar(dtxObject.barGroups[i].bpmMarkerArray, dtxObject.barGroups[i].barLength);
		}
		var chipTimePixPos = positioner.getAbsoluteChipPosition(0);
		var chipPixPos = plotter.plotBarNumber(i, chipTimePixPos);
		//Draw barlines
		plotter.plotBarLine("BarLine",chipTimePixPos);//At pos 0

		//Draw barlines and quarterlines Conditionally!
		//var showHideMarkerArray = dtxObject.barGroups[i].showHideLineMarkerArray;
		// //Init all lines flag to be true
		// var barLinesFlagsArray = [];
		// var drawnLinesCount = Math.floor(positioner.currentBarLines/Xcharter.QUARTERLINECOUNT);
		// for (var j = 0; j < drawnLinesCount; j++) {
		// 	barLinesFlagsArray.push(true);
		// };
		// var lowerBound = 0;

		//Draw QuarterLines
		var quarterLinePosArray = positioner.currentBarQuarterLinePositions();
		for (var j = 0; j < quarterLinePosArray.length; j++) {
			plotter.plotBarLine("QuarterLine",quarterLinePosArray[j]);
		};

		//Draw BPM Markers
		var currBpmMarkerArray = dtxObject.barGroups[i].bpmMarkerArray;
		for (var j = 0; j < currBpmMarkerArray.length; j++) {
			var bpmMarkTimePos = positioner.getAbsoluteChipPosition(currBpmMarkerArray[j].linePos);
			plotter.plotBPMMarker(currBpmMarkerArray[j].bpm, bpmMarkTimePos);
		};	

		//Finally draw the chips for each lane
		for (var j = 0; j < DtxParser.DtxBarLaneNames.length; j++) {
			if(dtxObject.barGroups[i].hasOwnProperty(DtxParser.DtxBarLaneNames[j]) ){
				var laneInBar = dtxObject.barGroups[i][ DtxParser.DtxBarLaneNames[j] ];

				for (var k = 0; k < laneInBar.length; k++) {
					chipTimePixPos = positioner.getAbsoluteChipPosition(laneInBar[k].linePos);
					plotter.plotChip(DtxParser.DtxBarLaneNames[j], chipTimePixPos);
				};
			}
		};


	};

	plotter.updateRender();

}

var drawTestChart = function(dtxObject, plotter){
	
	plotter.clear();

	plotter.drawChartInfo({
		title: "お米の美味しい炊き方、そしてお米を食べることによるその効果。",
		level: "9.10",
		bpm: "180",
		noteCount: 1476
	});
	//Test positioner
	var bpm = 180;

	//bpmMarkerArray must be sorted in ascending linePos order
	var bpmMarkerArray = [
		 {bpm: 180, linePos: 0},
		 {bpm: 100, linePos: 48}
		 //{bpm: 150, linePos: 48}
	];
	var barlength = 1.0;

	var positioner = new Xcharter.TimePixelPositioner(bpm, bpmMarkerArray,  1.0);
	var bpmMarkTimePos = 0;
	

	for (var i = 0; i < 15; i++) {
		var chipTimePixPos = positioner.getAbsoluteChipPosition(0);
		var chipPixPos = plotter.plotBarNumber(i, chipTimePixPos);
		chipPixPos = plotter.plotChip("LC", chipTimePixPos);
		
		//console.log(chipPixPos);

		//Draw bar lines first
		plotter.plotBarLine("BarLine",chipTimePixPos);

		chipTimePixPos = positioner.getAbsoluteChipPosition(48);
		//console.log(chipPixPos);
		plotter.plotBarLine("QuarterLine",chipTimePixPos);

		chipTimePixPos = positioner.getAbsoluteChipPosition(96);
		plotter.plotBarLine("QuarterLine",chipTimePixPos);

		chipTimePixPos = positioner.getAbsoluteChipPosition(144);
		plotter.plotBarLine("QuarterLine",chipTimePixPos);

		//Draw BPM Markers
		for (var j = 0; j < bpmMarkerArray.length; j++) {
			bpmMarkTimePos = positioner.getAbsoluteChipPosition(bpmMarkerArray[j].linePos);
			plotter.plotBPMMarker(bpmMarkerArray[j].bpm, bpmMarkTimePos);
		};		

		//Draw chips
		chipTimePixPos = positioner.getAbsoluteChipPosition(12);
		chipPixPos = plotter.plotChip("HH", chipTimePixPos);
		//console.log(chipPixPos);

		chipTimePixPos = positioner.getAbsoluteChipPosition(24);
		chipPixPos = plotter.plotChip("LP", chipTimePixPos);
		//console.log(chipPixPos);

		chipTimePixPos = positioner.getAbsoluteChipPosition(36);
		chipPixPos = plotter.plotChip("SD", chipTimePixPos);
		//console.log(chipPixPos);

		chipTimePixPos = positioner.getAbsoluteChipPosition(48);
		chipPixPos = plotter.plotChip("HT", chipTimePixPos);
		//console.log(chipPixPos);

		chipTimePixPos = positioner.getAbsoluteChipPosition(60);
		chipPixPos = plotter.plotChip("BD", chipTimePixPos);
		//console.log(chipPixPos);

		chipTimePixPos = positioner.getAbsoluteChipPosition(72);
		chipPixPos = plotter.plotChip("LT", chipTimePixPos);
		//console.log(chipPixPos);

		chipTimePixPos = positioner.getAbsoluteChipPosition(84);
		chipPixPos = plotter.plotChip("FT", chipTimePixPos);
		//console.log(chipPixPos);

		chipTimePixPos = positioner.getAbsoluteChipPosition(96);
		chipPixPos = plotter.plotChip("RC", chipTimePixPos);
		//console.log(chipPixPos);

		chipTimePixPos = positioner.getAbsoluteChipPosition(108);
		chipPixPos = plotter.plotChip("RD", chipTimePixPos);
		//console.log(chipPixPos);

		bpmMarkerArray = [
			 {bpm: 180, linePos: 0}
			 //{bpm: 150, linePos: 48},
			 //{bpm: 150, linePos: 48}
		];

		positioner.moveToNextBar(bpmMarkerArray, 1.0);
	};

	plotter.updateRender();
};