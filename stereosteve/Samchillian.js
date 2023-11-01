/*

	Samchillian 0.1

	A very basic version of Samchillian Tip Tip Tip Cheeepeeeee
	created by Leon Gruenbaum

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
var center = 60;

var outOfRange = 0;
var upperBound = 108;
var lowerBound = 21;
var multiplier = 1;
var learnMode = false;

var PluginParameters = [
  {
    name: "Out of range",
    type: "menu",
    valueStrings: ["Wrap", "Constrain", "Drop", "Recenter"],
    defaultValue: 0,
    onChange: (v) => (outOfRange = v),
  },
  {
    name: "Low Note",
    type: "linear",
    defaultValue: lowerBound,
    minValue: 0,
    maxValue: 127,
    numberOfSteps: 127,
    onChange: (v) => (lowerBound = v),
  },
  {
    name: "High Note",
    type: "linear",
    defaultValue: upperBound,
    minValue: 0,
    maxValue: 127,
    numberOfSteps: 127,
    onChange: (v) => (upperBound = v),
  },
  {
    name: "Multiplier",
    type: "linear",
    defaultValue: 1,
    minValue: 0,
    maxValue: 2,
    numberOfSteps: 20,
    onChange: (v) => (multiplier = v),
  },
  {
    name: "Recenter",
    type: "momentary",
    onChange: () => (cursor = center),
  },
  {
    name: "Learn",
    type: "momentary",
    onChange: () => (learnMode = true),
  },
];

function ParameterChanged(param, value) {
  const details = PluginParameters[param];
  //Trace(`param ${param} ${value}`);
  details.onChange(value);
}

// the pitch to move a relative amount on each key press
var cursor = center;

var activeNotes = [];

function HandleMIDI(event) {
  //event.trace();

  if (event instanceof NoteOn) {
    //silence(event.pitch) ?

    if (learnMode) {
      center = event.pitch;
      learnMode = false;
      Trace(`center=${center}`);
      return;
    }

    event.initialPitch = event.pitch;
    var diff = (event.pitch - center) * multiplier;
    cursor += diff;

    // if outside bounds, wrap around range
    if (cursor > upperBound) {
      switch (outOfRange) {
        case 0:
          cursor = lowerBound;
          break;
        case 1:
          cursor += diff * -2;
          break;
        case 2:
          cursor = upperBound;
          return;
        case 3:
          cursor = center;
          break;
      }
    }
    if (cursor < lowerBound) {
      switch (outOfRange) {
        case 0:
          cursor = upperBound;
          break;
        case 1:
          cursor += diff * -2;
          break;
        case 2:
          cursor = lowerBound;
          return;
        case 3:
          cursor = 60;
          break;
      }
    }

    Trace(
      `pitch = ${event.pitch} mult = ${multiplier} diff = ${diff} cursor = ${cursor}`
    );

    event.pitch = cursor;
    activeNotes.push(event);
  } else if (event instanceof NoteOff) {
    silence(event.pitch);
    return;
  }

  event.send();
}

function silence(initialPitch) {
  const idx = activeNotes.findIndex((n) => n.initialPitch == initialPitch);
  if (idx > -1) {
    const note = activeNotes[idx];
    const off = new NoteOff();
    off.pitch = note.pitch;
    off.send();
    activeNotes.splice(idx, 1);
  }
}
