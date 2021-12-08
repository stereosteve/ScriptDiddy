/*

	Samchillian 1.0

	A very basic version of Samchillian Tip Tip Tip Cheeepeeeee.
	
	See:
		https://en.wikipedia.org/wiki/Samchillian
		https://www.leongruenbaum.com/samchilliankidchillian

*/

// the midi note to act as center key
// notes above and below will be used to move the cursor a relative amount
var center = 60

// the pitch to move a relative amount on each key press
var cursor = center;

var activeNotes = []


function HandleMIDI(event) {
	event.trace();

	if (event instanceof NoteOn) {

		silence(event.pitch)

		event.initialPitch = event.pitch
		var diff = event.pitch - center
		cursor += diff;
		event.pitch = cursor;
		event.send();

		activeNotes.push(event)
	}

	if (event instanceof NoteOff) {
		silence(event.pitch)
	}
}


function silence(initialPitch) {
	const idx = activeNotes.findIndex(n => n.initialPitch == initialPitch)
	if (idx > -1) {
		const note = activeNotes[idx]
		new NoteOff(note).send()
		activeNotes.splice(idx, 1)
	}
}