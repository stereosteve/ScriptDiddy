/*
    Random Offset Probability.pst
    
    This PST transposes an incoming note up or down by random octaves and then
    applies a fixed semitone offset. The chance of an offset being applied,
    is determined by the Offset Probability slider. The range of the random
    octaves are defined with the Octave Offset Range: High and Low sliders,
    which are relative to the incoming note. 
    
    For example: if the incoming note is 60, and the high range is 2 and the low
    range is -1, a random octave range between 48 and 84 will be selected.

    After the note is offset by the random octave, a semitone offset is applied.
    For example: if the Semitone Offset is 3, the possible offset values would
    be 51 (-12 + 3), 63 (0 + 3), 75 (12 + 3), or 87 (24 + 3).
    
    Any notes that are transposed out of the normal MIDI note range (0-127) will
    be transposed up or down, until it is within the normal MIDI note range. 
*/

var NOTE_TRACKING = {};
var PROBABILITY = 50;
var HIGH_RANGE = 2;
var LOW_RANGE = -1;
var SEMINTONE_OFFSET = 0;
 
function HandleMIDI (event) {
    if(event instanceof NoteOn) {
        //check if the offset should be applied, based on the probability
        if(applyOffset(PROBABILITY)) { 

            var originalNote = event.pitch;

            //select random octave offset in the defined range
            var randomInRange = 
              Math.round(Math.random() * (HIGH_RANGE - LOW_RANGE) + LOW_RANGE);
            
            //apply octave and semitone offsets
            event.pitch += (randomInRange * 12) + SEMINTONE_OFFSET;
            
            //if the pitch is out of range, tranpose it into range
            while(event.pitch > 127) {
                event.pitch -= 12;
            }
            while(event.pitch < 0) {
                event.pitch += 12;
            }
      
            //keep track of the original and offset note pairs
            NOTE_TRACKING[originalNote] = event.pitch;

            event.send();

        } else {
            //send original note without offset
            event.send();   
        }
      
    } else if (event instanceof NoteOff) {
        //if the pitch was paired to an offset pitch, get the offset pitch
        if(event.pitch in NOTE_TRACKING) {        
            var temp =  event.pitch;
            event.pitch = NOTE_TRACKING[event.pitch];             
            delete NOTE_TRACKING[temp];
        }
    
        event.send();
    
    } else {
        //send all other MIDI events
        event.send();
    }
}

function ParameterChanged (param, value) {
    switch (param) {
        case 0:
            PROBABILITY = value;
            break;
        case 1: 
            HIGH_RANGE = value;
            break;
        case 2: 
            LOW_RANGE = value;
            break;
        case 3:
            SEMINTONE_OFFSET = value;
            break;
        default:
            Trace ("ParameterChanged(): error: invalid parameter index");
    }
}

//use the probability value to determine if an offset should be applied
function applyOffset (probability) {   
    return  (Math.ceil(Math.random()*100) <= probability) ? true : false;
}

//initialize PluginParameters
var PluginParameters = [{
    name:"Offset Probability",
    minValue:0, 
    maxValue:100, 
    numberOfSteps:100, 
    defaultValue:50, 
    type:"linear",
    unit:"%"
}, {
    name:"Octave Offset Range: High",
    minValue:0, 
    maxValue:5, 
    numberOfSteps:5, 
    defaultValue:2, 
    type:"linear",
    unit:""
}, {
    name:"Octave Offset Range: Low",
    minValue:-5, 
    maxValue:0, 
    numberOfSteps:5, 
    defaultValue:-1, 
    type:"linear",
    unit:""
}, {
    name:"Semitone Offset",
    type:"linear",
    minValue:-11,
    maxValue:11,
    numberOfSteps:22,
    defaultValue:0,
    unit:"semi"
}];