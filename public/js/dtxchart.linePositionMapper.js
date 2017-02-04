/*
DtxChart.LinePositionMapper
Description: The LinePositionMapper reads in dtxdata object, 
calculate and stores absolute line positions for the start of each bar and all bpmChangeMarkers within each bar
This allows easy computing of absolute position of any line given a bar and line number now that each bar has independent absolute position information
*/
var DtxChart = (function(mod){

    //Constants
    var BASEBPM = 180.00;

    /**
     *Constructor 
     */
    function LinePositionMapper(dtxdata){
        this._initialize();
        this._computePositions(dtxdata);
        //
        //console.log(this.barGroups);
    }

    /**
     * 
     */
    LinePositionMapper.prototype.absolutePositionOfLine = function(barNumber, lineNumber){
        //check barNumber
        if(typeof barNumber !== "number" || barNumber < 0 || barNumber >= this.barGroups.length){
            console.error("barNumber is invalid or out of range");
            return;
        }

        //Check lineNumber
        if(typeof lineNumber !== "number" || lineNumber < 0 || lineNumber >= this.barGroups[barNumber]["lines"]){
            console.error("lineNumber is invalid or out of range");
            return;
        }

        //Search for line number iteratively and compute accordingly
        var currBar = this.barGroups[barNumber];
        var currLinePos = 0;
        var currAbsPos = this.barGroups[barNumber]["absStartPos"];
        var currBPM = this.barGroups[barNumber]["barStartBPM"];

        //Search through bpm marker array if the line number fits within any section
        for(var i in currBar["bpmMarkerArray"]){
            var currBPMMarkerPos = currBar["bpmMarkerArray"][i]["pos"];

            //Check if lineNumber is within currStartLine inclusive and first bpm marker position (exclusive)
            if(lineNumber >= currLinePos && lineNumber < currBPMMarkerPos) 
            {
                var distance = (lineNumber - currLinePos) * BASEBPM / currBPM;//Formula to compute distance
                return distance + currAbsPos;
            }

            //update variables for next iteration
            currLinePos = currBPMMarkerPos;
            currAbsPos = currBar["bpmMarkerArray"][i]["absPos"];
            currBPM = currBar["bpmMarkerArray"][i]["bpm"];
        }
        //End Search

        //If line number is not found within any bpm markers or bpmMarkerArray is empty, compute with updated information
        var distance = (lineNumber - currLinePos) * BASEBPM / currBPM;//Formula to compute distance
        return distance + currAbsPos;

    }

    LinePositionMapper.prototype.chartLength = function(){
        return this.endLineAbsPosition;
    }

    //This method does not check for correctness of values
    //dtxdata data correctness to be done inside parser instead
    LinePositionMapper.prototype._computePositions = function(dtxdata){

        var currBPM = dtxdata.chartInfo.bpm;//Initial BPM, this variable keeps changing within the nested loop as bpm markers are iterated through
        var currBarStartLineAbsPos = 0.0;//Starts at 0.0 for the first bar
        
        for(var i in dtxdata.barGroups){
            //console.log(i);
            var barPosInfo = {
                "lines": dtxdata.barGroups[i]["lines"],
                "bpmMarkerArray": dtxdata.barGroups[i]["bpmMarkerArray"] || [],//Note that in actual JSON bpmMarkerArray property may not exist so we need to check and set default empty array if not available
                "absStartPos": currBarStartLineAbsPos,
                "barStartBPM": currBPM//Need to store this info, otherwise have to re-compute from previous bars!
            };

            //
            var currBarLineCount = barPosInfo["lines"];

            //Calculate the absolute position for each bpm marker
            var currLineAbsPos = currBarStartLineAbsPos;
            var currLineNumPosInBar = 0;

            //This section is skipped for most songs that have constant BPM throughout
            for(var j in barPosInfo["bpmMarkerArray"]){
                var currBPMMarkerBPM = barPosInfo["bpmMarkerArray"][j]["bpm"];
                var currBPMMarkerLineNumPos = barPosInfo["bpmMarkerArray"][j]["pos"];

                //Compute the absolute position of current marker
                var distance = (currBPMMarkerLineNumPos - currLineNumPosInBar) * BASEBPM / currBPM;//Formula to compute distance
                var currMarkerAbsPos = currLineAbsPos + distance;

                //Save inside barPosInfo
                barPosInfo["bpmMarkerArray"][j]["absPos"] = currMarkerAbsPos;

                //Update state variables for the next marker
                currLineAbsPos = currMarkerAbsPos;
                currLineNumPosInBar = currBPMMarkerLineNumPos;
                currBPM = currBPMMarkerBPM;//To be carried over to next bar once this for-loop ends
            }
            //End BPM marker absolute position computation

            //Calculate currBarStartLineAbsPos to be used for the next bar in next iteration
            var finalDistance = (currBarLineCount - currLineNumPosInBar) * BASEBPM / currBPM;
            currBarStartLineAbsPos = currLineAbsPos + finalDistance;

            //Push current barPosInfo into array
            this.barGroups.push(barPosInfo);
        }

        //The end line does not belong to any bar and is one line after very last line of last bar
        //This is useful information for chart drawing class
        this.endLineAbsPosition = currBarStartLineAbsPos;

    };

    

    LinePositionMapper.prototype._initialize = function(){
        this.barGroups = [];
        this.endLineAbsPosition = 0.0;
    };

    //For internal reference
    var sampleLinePosMap = {
        "barGroups":[
            {
                "lines": 192,
                "absStartPos": 0,
                "barStartBPM": 180,
                "bpmMarkerArray": [
                    {
                        "absPos": 0,
                        "pos": 0,
                        "bpm": 135
                    },
                    {
                        "absPos": 48,
                        "pos": 48,
                        "bpm": 130
                    },
                    {
                        "absPos": 96,
                        "pos": 96,
                        "bpm": 118
                    }
                ]
            },
            {

            }
        ]
    };

    //
    mod.LinePositionMapper = LinePositionMapper;

    return mod;
}(DtxChart || {} ));