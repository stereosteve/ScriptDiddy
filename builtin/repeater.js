/* 
    Note Repeater: This script demonstrates how to achieve a similiar 
                   functionality as the MIDI Plug-in "Note Repeater". 
*/

var NeedsTimingInfo = true;

//track if MIDI.allNotesOff() has been sent after stopping playback
var notesOffSent = false;

//track the number of notes that are currently being pressed
var numberOfNotes = 0;

//track the number of repeats to perform
var numberOfRepeats = 3;

//track the transposition to apply
var trasnposeAmount = 0;

function HandleMIDI(e) {

    var info = GetTimingInfo();
    
    if (e instanceof NoteOn) {
 
        numberOfNotes++ ;
    
        //only update these variables after the user releases all notes
        //and plays a new set of notes
        if(numberOfNotes == 1) {
            numberOfRepeats = GetParameter("Repeats");
            transposeAmount = GetParameter("Transpose");
        }
 
        //originally played note on
 	      e.send();
 	
        //delayed note ons
 	      for(var i=0; i< numberOfRepeats ;i++) {
 	
 	          e.pitch += transposeAmount;
 	        
 	          if(e.pitch > 127) {
 	              e.pitch = 127;
 	          }  
 	          
 	          e.velocity = e.velocity * (GetParameter("Velocity Multiplier")/100);

 	          if(e.velocity < 1) {
 	              e.velocity = 1;
 	          }
 	  
  	          if(e.velocity > 127) {
   	            e.velocity = 127;
 	          }
 	 	    
 	          e.sendAfterBeats((i+1) * getTime(GetParameter("Time")));
 	      }
    }
    else if(e instanceof NoteOff) {
        
        //originally played note off
        e.send();
        
        numberOfNotes--;
      
        //delated note offs
        for(var i=0; i< numberOfRepeats ;i++) {
      
            e.pitch += transposeAmount;
            
            if(e.pitch > 127) {
 	              e.pitch = 127;
 	          }  

  	          e.sendAfterBeats((i+1) * getTime(GetParameter("Time")));
   	    }
    }
    else {
        e.send() //pass all other MIDI events
    }
}


function ProcessMIDI() {

    var info = GetTimingInfo();
	 
    //if the transport stops, and allNotesOff() has not yet been sent
    if (!info.playing && !notesOffSent){
        MIDI.allNotesOff();
        notesOffSent = true;
    }  
  
    //reset the notesOffSent flag
    if(info.playing && notesOffSent) {
        notesOffSent = false;
    }
}

//get the division for the associated menu index
function getTime(index) {

    var convertedValue = 1;
	
    switch(index) {
        case 0:
            convertedValue = .166; //1/16T
            break;
        case 1:
            convertedValue = .25;  //1/16
            break;
        case 2:
            convertedValue = .375;  //1/16.
            break;
        case 3: 
            convertedValue = .333; //1/8T
            break;
        case 4: 
            convertedValue = .5;  //1/8
            break;
        case 5:
            convertedValue = .75; //1/8.
            break;
        case 6: 
            convertedValue = .666; //1/4T
            break;
        case 7:
            convertedValue = 1; //1/4
            break;
        case 8: 
            convertedValue = 1.5; //1/4.
            break;
        case 9:
            convertedValue = 1.333; //1/2T
            break;
        case 10: 
            convertedValue = 2; //1/2
            break;
        case 11:
            convertedValue = 3; //1/2.
            break;
        default:
            Trace("error in getTime()");
    }
    
    return convertedValue;
}

//define UI parameters 
var PluginParameters = [{name:"Time", type:"menu", 
                        valueStrings:["1/16 T", "1/16", "1/16 .", "1/8 T", "1/8", 
                        "1/8 .", "1/4 T", "1/4", "1/4 .", "1/2 T", "1/2", "1/2 ."],
                         defaultValue:5, numberOfSteps:11}, 
                        {name:"Repeats", defaultValue:3, minValue:1, maxValue:32, 
                         numberOfSteps:31, type:"linear"}, 
                        {name:"Transpose", defaultValue:0, minValue:-48, 
                         maxValue:48, numberOfSteps:96, type:"linear"},
                        {name:"Velocity Multiplier", defaultValue:66, 
                        minValue:1, maxValue:200, numberOfSteps:199, 
                        unit:"%", type:"linear" }];