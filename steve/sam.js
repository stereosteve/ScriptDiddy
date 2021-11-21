var cursor = 43;

function HandleMIDI(event)
{
	event.trace();

	if (event instanceof NoteOn) {
		var diff = event.pitch - 43
		cursor += diff;
		event.pitch = cursor;
		Trace(diff);
	}

	
	event.send();
}
