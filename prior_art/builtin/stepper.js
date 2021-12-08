//-----------------------------------------------------------------------------
// Note Stepper
//-----------------------------------------------------------------------------

var activeNotes = [];
var lastKey = 0;

var counters = []; // array of counters for each key
for (var i=0; i<127; i++) {
	counters.push(0);
}

// set all counters to step n
function resetCounters(n) {
	for (var i=0; i<counters.length; i++)
		counters[i] = n;
}

/* Step through notes and pass all other events through.  Held notes are 
held in activeNotes array to keep track of the corresponding note offs.*/
function HandleMIDI(event) {
	if (event instanceof NoteOn) {
		if (GetParameter('Global Reset Via Key') && 
		event.pitch == GetParameter('Global Reset Key')) {
			resetCounters(0);
		}
		if (GetParameter('Reset On New Note') && event.pitch != lastKey) {
			lastKey = event.pitch;
			resetCounters(1);
			storeAndSend(event);
		}
		else { // start steppin
				lastKey = event.pitch;
				event.pitchOffset = counters[lastKey] * GetParameter('Step Size');
				storeAndSend(event);
		    	counters[lastKey] += 1;
				if (counters[lastKey] >= GetParameter('Max Steps'))
		  			counters[lastKey] = 0;
	  	}
	}
	else if (event instanceof NoteOff) {
		clearAndSend(event);
	}
	else 
		event.send();
}

/* store the note in the activeNotes array along with it's pitchOffset
also apply the pitchOffset and send*/
function storeAndSend(event) {
	if (GetParameter('Global Reset Via Key') && 
			GetParameter('Send Reset Key') == 0 && 
			event.pitch == GetParameter('Global Reset Key'))
		return 0;
	activeNotes.push(event);
	var on = new NoteOn(event);
	if (event.pitchOffset)
		on.pitch += event.pitchOffset;
	on.send();
}

/* match the note off with a note on in activeNotes array and then re-apply the
pitchOffset and send*/
function clearAndSend(event) {
	for (i=0; i < activeNotes.length; i++) {
		if (event.pitch == activeNotes[i].pitch) {
			var foundNote = activeNotes[i];
			var off = new NoteOff(foundNote);
			if (foundNote.pitchOffset)
				off.pitch += foundNote.pitchOffset;
			off.send();
			activeNotes.splice(i, 1);
			break;
		}
	}
}

// parameter definitions
var PluginParameters = [
{name:"Step Size", type:"linear", minValue:-12, maxValue:12,
    defaultValue:3, numberOfSteps:24,},
{name:"Max Steps", type:"linear", minValue:2, maxValue:10,
    defaultValue:5, numberOfSteps:8},
{name:'Reset On New Note', type:'menu', valueStrings:['off','on'], 
    defaultValue:0, numberOfSteps:100},
{name:'Global Reset Via Key', type:'menu', valueStrings:['off','on'],
    defaultValue:0, numberOfSteps:100},
{name:'Global Reset Key', type:'menu', valueStrings:MIDI._noteNames,
    defaultValue:MIDI.noteNumber('C2'), numberOfSteps: 100},
{name:'Send Reset Key', type:'menu', valueStrings:['off', 'on'],
    defaultValue:0, numberOfSteps: 100}];
