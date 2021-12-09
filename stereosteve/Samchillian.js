/*

	Samchillian 0.1

	A very basic version of Samchillian Tip Tip Tip Cheeepeeeee.
	
	See:
		https://en.wikipedia.org/wiki/Samchillian
		https://www.leongruenbaum.com/samchilliankidchillian
	
	TODO:
		* input scale (white keys only eg)
		* output scale (D Dorian eg)
		* microtonal output scales?
		* ui parameters

*/

var NeedsTimingInfo = true;

// the midi note to act as center key
// notes above and below will be used to move the cursor a relative amount
var center = 60

var upperBound = 108
var lowerBound = 21

// the pitch to move a relative amount on each key press
var cursor = center;

var activeNotes = []


function HandleMIDI(event) {
	//event.trace();

	if (event instanceof NoteOn) {
		//silence(event.pitch) ?

		event.initialPitch = event.pitch
		var diff = event.pitch - center
		cursor += diff;

		// if outside bounds, wrap around range
		if (cursor > upperBound) {
			cursor = lowerBound + (cursor - upperBound)
		}
		if (cursor < lowerBound) {
			cursor = upperBound - (lowerBound - cursor)
		}

		event.pitch = cursor;
		activeNotes.push(event)
	}

	else if (event instanceof NoteOff) {
		silence(event.pitch)
	}

	event.send();
}


function silence(initialPitch) {
	const idx = activeNotes.findIndex(n => n.initialPitch == initialPitch)
	if (idx > -1) {
		const note = activeNotes[idx]
		const off = new NoteOff()
		off.pitch = note.pitch
		off.send()
		activeNotes.splice(idx, 1)
	}
}