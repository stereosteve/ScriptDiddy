//------------------------------------------------------------------------------------
// Invert Notes
//------------------------------------------------------------------------------------

// This script inverts MIDI notes based around the center pitch the user provides

var defaultCp = 127			// Center Pitch about which everything is inverted
var curCp = defaultCp;		// updated only when all notes are off
var fCp = defaultCp;		// future center pitch, updated every time user moves slider
var noteCount = 0;			// Track any outstanding note Off events

// take in the current midi event, invert it, send it, track the note count
function HandleMIDI(event) {
	// update center pitch when all notes are released
	if (noteCount == 0)
		curCp = getInvPoint(GetParameter('Center Pitch'));
		
	// invert note events
	if (event instanceof Note) {
		event.pitch = calcInversion(event.pitch);
		event.send();
	}
	
	// keep track of current played notes
	if(event instanceof NoteOn)
		noteCount++;
	else if(event instanceof NoteOff)
		noteCount--;	
		
	// pass through non-note events
	else
		event.send();
}

//Return a midi note number for the user center pitch selection
function getInvPoint(index) {
	if (index == 0)
		return 127;
	else
		return MIDI.noteNumber(invPoints[index]);
}

// calculate inverted pitch
function calcInversion(pitch) {
	var invPitch;
	if (curCp == 127)
		invPitch = 127 - pitch;		// fully invert
	else
		invPitch = (curCp - pitch) + curCp;	// invert about the center pitch	
	return invPitch;
}

//-----------------------------------------------------------------------------
var invPoints = ['None', 'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3'];
var PluginParameters = [
			{name:"Center Pitch", 
 			type:"menu", 
  			valueStrings:invPoints,
  			numberOfSteps: 13, 
  			minValue:0,
 			maxValue:1,
			defaultValue:0,}
];
