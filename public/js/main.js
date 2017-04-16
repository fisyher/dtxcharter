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
	var dtxdataObject = null;
	var lineMapper = null;
	var graph = null;
	var availableCharts = {
            drum: false,
            guitar: false,
            bass: false
        };
	var canRedraw = false;

	//
	function createDrumCanvasSheets(canvasConfigArray){
		for(var i in canvasConfigArray){
			$("#drum_chart_container").append('<div class="row"><div class="col-md-12 col-sm-12 col-xs-12 canvasSheetContainer"><canvas id="'+ canvasConfigArray[i].elementId +'"></canvas></div></div>');
		}
	}

	function createGraphPage(){
		$("#graph_container").append('<div class="row"><div class="col-md-12 col-sm-12 col-xs-12 canvasSheetContainer"><canvas id="dtxgraph"></canvas></div></div>')
	}

	// create a wrapper around native canvas element (with id="c1")
	$('#Open').click(function(e){
		$('#openFile').trigger('click');
	});
	
	//var plotter = new Xcharter.Plotter();
	//
	var charter2 = new DtxChart.Charter();
	
	$('#Draw').click(function(e){
		if(!canRedraw){
			return;
		}

		//Add DOM manipulation code
		charter2.clearDTXChart();		
		$("#drum_chart_container").empty();
		$("#guitar_chart_container").empty();
		$("#bass_chart_container").empty();
		$("#graph_container").empty();
		//
		charter2.setConfig({
			scale: parseFloat( $('#SelectScaleFactor').val() ),
			pageHeight: parseInt( $('#SelectPageHeight').val() ),
			pagePerCanvas: parseInt( $('#SelectPagePerCanvas').val()),
			chartType: $('#SelectMode').val(),
			barAligned : true//Test
		});

		//
		var canvasConfigArray = charter2.canvasRequired();
		//console.log("Required canvas count: ",canvasConfigArray.length);
		//
		createDrumCanvasSheets(canvasConfigArray);	
		createGraphPage();
		
		charter2.setCanvasArray(canvasConfigArray);
		charter2.drawDTXChart();	
		//Draw graph last
		graph = new DtxChart.Graph(dtxdataObject, "dtxgraph");
		graph.drawGraph();

		//'Click' on first non-home tabs
		var hLink = "home";
		if(availableCharts.drum){
			hLink = "menu1";				
		}
		else if(availableCharts.guitar){
			hLink = "menu2";					
		}
		else if(availableCharts.bass){
			hLink = "menu3";
		}
		$('.nav-tabs a[href="#' + hLink + '"]').tab('show');//Programmatically clicks on the selected tab
	});

	$('#Clear').click(function(e){
		
		charter2.clearDTXChart();
		canRedraw = false;
		availableCharts  = {
            drum: false,
            guitar: false,
            bass: false
        };

		//Add DOM manipulation code
		$('#openFile').val('');
		$("#drum_chart_container").empty();
		$("#guitar_chart_container").empty();
		$("#bass_chart_container").empty();
		$("#graph_container").empty();
		$('#placeholder1').css('display', '');
		$('#placeholder2').css('display', '');
		$('#placeholder3').css('display', '');
		$('#placeholder4').css('display', '');
		$('.nav-tabs a[href="#home"]').tab('show');
	});

	$('#openFile').change(function(e){
		//console.log(e);

		var f = e.target.files[0];
		if(f){
			var r = new FileReader();
			r.onload = function(e) { 
				var contents = e.target.result;
				var arrayString = f.name.split(".");
				var extension = arrayString[arrayString.length - 1];			
				//Parse contents and create dtx-object from it
				//var dtx_parser = new DtxParser();
				//var status = dtx_parser.parseDtxText(contents);

				//
				var dtxparserv2 = new DtxChart.Parser({mode: extension.toLowerCase()});
				var ret = dtxparserv2.parseDtxText(contents);
				if(ret){
					dtxdataObject = dtxparserv2.getDtxDataObject();
					console.log(dtxdataObject);
					console.log(JSON.stringify(dtxdataObject));

					lineMapper = new DtxChart.LinePositionMapper(dtxdataObject);
					var estimatedDuration = lineMapper.estimateSongDuration();
					console.log("Song is estimated to be " + estimatedDuration + " seconds long");
					charter2.setDtxData(dtxdataObject, lineMapper);//
					charter2.setConfig({
						scale: parseFloat( $('#SelectScaleFactor').val() ),
						pageHeight: parseInt( $('#SelectPageHeight').val() ),
						pagePerCanvas: parseInt( $('#SelectPagePerCanvas').val()),
						chartType: $('#SelectMode').val(),
						barAligned : true,//Test
						direction: "up"//up or down
					});
					
					//
					var canvasConfigArray = charter2.canvasRequired();
					console.log("Required canvas count: ",canvasConfigArray.length);
					
					//Clear chart before loading										
					$("#drum_chart_container").empty();
					$("#guitar_chart_container").empty();
					$("#bass_chart_container").empty();
					$("#graph_container").empty();
					//
					createDrumCanvasSheets(canvasConfigArray);
					createGraphPage();

					//canvasConfigArray[0].backgroundColor = "#000000";					
					charter2.setCanvasArray(canvasConfigArray);
					charter2.drawDTXChart();
					
					//Draw graph last
					graph = new DtxChart.Graph(dtxdataObject, "dtxgraph");
					graph.drawGraph();

					//Hide placeholders of available charts only
					availableCharts = dtxparserv2.availableCharts();
					if(availableCharts.drum){
						$('#placeholder1').css('display', 'none');					
					}
					else{
						$('#placeholder1').css('display', '');
					}
					if(availableCharts.guitar){
						$('#placeholder2').css('display', 'none');					
					}
					else{
						$('#placeholder2').css('display', '');	
					}
					if(availableCharts.bass){
						$('#placeholder3').css('display', 'none');
					}
					else{
						$('#placeholder3').css('display', '');
					}
					$('#placeholder4').css('display', 'none');

					//'Click' on first non-home tabs
					var hLink = "home";
					if(availableCharts.drum){
						hLink = "menu1";				
					}
					else if(availableCharts.guitar){
						hLink = "menu2";					
					}
					else if(availableCharts.bass){
						hLink = "menu3";
					}
					$('.nav-tabs a[href="#' + hLink + '"]').tab('show');//Programmatically clicks on the selected tab
					canRedraw = true;
				}				
			}
			r.readAsText(f,encoding);
		}

	});
	
});