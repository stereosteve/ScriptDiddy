//-----------------------------------------------------------------------------
// Harmonizer
//-----------------------------------------------------------------------------

// number of harmonies, also drives parameter creation. change, then run script
var numVoices = 2;

// global array of active notes for record keeping
var activeNotes = [];

//-----------------------------------------------------------------------------
function HandleMIDI(event) {
    if(event instanceof NoteOn) {
        
        // store a copy for record keeping and send it
        var originalNote = new NoteOn(event);
        var record = {originalPitch:event.pitch, events:[originalNote]};
        event.send();
        
        // now harmonize
        for (var i=1; i<numVoices + 1; i++) {
            
            // create a copy of the note on and apply parameters
            var harmony = new NoteOn(event);
            harmony.pitch += GetParameter("Transposition " + i);
            harmony.velocity = GetParameter("Velocity " + i);
            
            // store it alongside the original note and send it
            record.events.push(harmony);
            harmony.send();
        }
        
    // put the record of all harmonies in activeNotes array
    activeNotes.push(record);
    }
    
    else if(event instanceof NoteOff) {
        
        // find a match for the note off in our activeNotes record
        for (var i in activeNotes){
            if(activeNotes[i].originalPitch == event.pitch) {
    
                // send note offs for each note stored in the record
                for (var j=0; j<activeNotes[i].events.length; j++) {
                    var noteOff = new NoteOff(activeNotes[i].events[j]);
                    noteOff.send();
                }
                
                // remove the record from activeNotes
                activeNotes.splice(i,1);
                break;
            }
        }
    }
    
    // pass non-note events through
    else {
      event.send();
    }
}

//-----------------------------------------------------------------------------
// when a parameter changes, kill active note and send the new one
function ParameterChanged(param, value) {
    
    // which voice is it?
    var voiceIndex = (param % 2 == 0) ? param / 2 : (param - 1) / 2;

    for(var i in activeNotes){
        var voiceToChange = activeNotes[i].events[voiceIndex+1];

        // send note off
        var noteOff = new NoteOff(voiceToChange);
        noteOff.send();

        // modify according to param change
        if (param % 2 == 0)
            voiceToChange.pitch = activeNotes[i].originalPitch + value; 
        else
            voiceToChange.velocity = value;
            
        // send
        voiceToChange.send();
    }
}

//-----------------------------------------------------------------------------
// Parameter Definitions
var pitches = [5, -12, 3, 7, 12, 19, 24];

var PluginParameters = [];
for (var i=0; i<numVoices; i++) {
    var voiceNumber = i + 1;
    PluginParameters.push({ name:"Transposition " + voiceNumber,
                          type:'lin', minValue:-24, maxValue:24, numberOfSteps:48, 
                            defaultValue:pitches[i % pitches.length]
                          });
            
    PluginParameters.push({ name:"Velocity " + voiceNumber, 
                            type:'lin',
                            minValue:1, maxValue:127, numberOfSteps:126,
                            defaultValue:100
                          });
}
