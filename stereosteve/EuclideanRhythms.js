/*

  Euclidean Rhythms 0.2

*/

var NeedsTimingInfo = true;

// visible parameters
var unit = 0.25;
var pulses = 5;
var stepCount = 16;
var offset = 0;
var perNoteTiming = 1;
var quantizeRepeats = 1;

// computed
var lengthInBeats;
var activeNotes = [];
var patt;
var pattString;

var TIMES = {
	"1/64t": 0.04166666666667,
	"1/64": 0.0625,
	"1/32t": 0.08333333333333,
	"1/32": 0.125,
	"1/16t": 0.16666666666667,
	"1/16": 0.25,
	"1/8T": 0.33333333333333,
	"1/8": 0.5,
	"1/4t": 0.66666666666667,
	"1/4": 1,
	"1/2t": 1.33333333333333,
	"1/2": 2,
	"1/1": 4,
};

var PluginParameters = [
	{
		name: "Division",
		type: "menu",
		valueStrings: Object.keys(TIMES),
		defaultValue: 5,
	},
	{
		name: "Pulses",
		type: "linear",
		defaultValue: pulses,
		minValue: 1,
		maxValue: 32,
		numberOfSteps: 31,
	},
	{
		name: "Step Count",
		type: "linear",
		defaultValue: stepCount,
		minValue: 1,
		maxValue: 32,
		numberOfSteps: 31,
	},
	{
		name: "Offset",
		type: "linear",
		defaultValue: offset,
		minValue: 0,
		maxValue: 32,
		numberOfSteps: 32,
	},
	{
		name: "Accentuation",
		type: "text",
	},
	{
		name: "Accents",
		type: "linear",
		defaultValue: pulses - 2,
		minValue: 0,
		maxValue: 32,
		numberOfSteps: 32,
	},
	{
		name: "Quieting",
		type: "linear",
		defaultValue: 0.5,
		minValue: 0,
		maxValue: 1,
		numberOfSteps: 100,
	},
	{
		name: "Timing",
		type: "text",
	},
	{
		name: "Note Length",
		type: "linear",
		defaultValue: 0.8,
		minValue: 0,
		maxValue: 4,
		numberOfSteps: 400,
	},
	{
		name: "Per Note Timing",
		type: "checkbox",
		defaultValue: perNoteTiming,
	},
	{
		name: "Quantize Repeats",
		type: "checkbox",
		defaultValue: quantizeRepeats,
	},
];

function ParameterChanged(param, value) {
	const details = PluginParameters[param];
	switch (details.name) {
		case "Division":
			unit = Object.values(TIMES)[value];
			break;
		case "Pulses":
			pulses = value;
			break;
		case "Step Count":
			stepCount = value;
			break;
		case "Offset":
			offset = value;
			break;
		case "Per Note Timing":
			perNoteTiming = value;
			break;
		case "Quantize Repeats":
			quantizeRepeats = value;
			break;
	}

	lengthInBeats = stepCount * unit;
	patt = bjorklund(pulses, stepCount, offset);

	// apply accents to patt
	// 0 = off, 1 = quiet, 2 = on
	const accents = bjorklund(GetParameter("Accents"), pulses, 0);
	let noteCounter = 0;
	for (let i in patt) {
		if (!patt[i]) continue;
		if (accents[noteCounter]) {
			patt[i]++;
		}
		noteCounter++;
	}

	const txt = patt.map((p) => p == 2 ? "●" : p ? "◒" : "◯").join(" ");
	if (pattString != txt) {
		pattString = txt;
		Trace(pattString);
	}
}

function HandleMIDI(note) {
	if (note instanceof NoteOn) {
		activeNotes.push(note);
	} else if (note instanceof NoteOff) {
		const idx = activeNotes.findIndex((n) => n.pitch == note.pitch);
		if (idx > -1) activeNotes.splice(idx, 1);
	} else if (note instanceof PolyPressure) {
		const found = activeNotes.find((n) => n.pitch == note.pitch);
		if (found) found.velocity = note.value;
		note.send();
	} else {
		note.send();
	}
}

function ProcessMIDI() {
	var musicInfo = GetTimingInfo();
	const globalCycleStart =
		(Math.floor(musicInfo.blockStartBeat / lengthInBeats) * lengthInBeats) + 1;

	for (let note of activeNotes) {
		let cycleStart = globalCycleStart;

		if (perNoteTiming) {
			const noteBeatPos = quantizeRepeats
				? _quantize(note.beatPos)
				: note.beatPos;
			const beatsHeld = musicInfo.blockStartBeat - noteBeatPos + 1;
			const didCycles = Math.floor(beatsHeld / lengthInBeats);
			cycleStart = noteBeatPos + (didCycles * lengthInBeats);
		}

		for (let i = 0; i < patt.length; i++) {
			if (!patt[i]) continue;
			let startBeat = (i * unit) + cycleStart;
			let endBeat = startBeat + (unit * GetParameter("Note Length"));
			if (musicInfo.cycling && endBeat >= musicInfo.rightCycleBeat) {
				endBeat = musicInfo.leftCycleBeat +
					(endBeat - musicInfo.rightCycleBeat);
			}

			if (startBeat < musicInfo.blockStartBeat) continue;
			if (startBeat > musicInfo.blockEndBeat) break;

			let noteOn = new NoteOn(note);

			// make non-accents quieter
			if (patt[i] == 1) {
				noteOn.velocity *= GetParameter("Quieting");
			}
			noteOn.sendAtBeat(startBeat);

			let noteOff = new NoteOff(noteOn);
			noteOff.sendAtBeat(endBeat);
		}
	}
}

// finds the closest beat that falls on a beat division "unit"
function _quantize(beatPos) {
	const offBy = beatPos % unit;
	const roundDown = beatPos - offBy;
	const roundUp = beatPos + (unit - offBy);
	if (beatPos - roundDown < roundUp - beatPos) {
		return roundDown;
	} else {
		return roundUp;
	}
}

// take from:
// https://github.com/Lokua/euclidean-sequence/blob/master/index.js
function bjorklund(pulses, steps, offset = 0) {
	if (steps === 0) {
		throw new RangeError("steps must be greater than 0");
	}

	if (pulses === 0) {
		return Array(steps).fill(0);
	}

	pulses = pulses >= steps ? steps : pulses;

	let pattern = [];
	const counts = [];
	const remainders = [];
	let divisor = steps - pulses;
	let level = 0;

	remainders.push(pulses);

	while (true) {
		counts.push(Math.floor(divisor / remainders[level]));
		const nextRemainder = divisor % remainders[level];
		remainders.push(nextRemainder);
		divisor = remainders[level];
		level++;

		if (remainders[level] <= 1) {
			break;
		}
	}

	counts.push(divisor);

	const build = (level) => {
		if (level === -1) {
			pattern.push(0);
		} else if (level === -2) {
			pattern.push(1);
		} else {
			for (let i = 0; i < counts[level]; i++) {
				build(level - 1);
			}
			if (remainders[level] !== 0) {
				build(level - 2);
			}
		}
	};

	build(level);

	const firstOn = pattern.indexOf(1);

	if (firstOn > -1) {
		pattern = [...pattern.slice(firstOn), ...pattern.slice(0, firstOn)];
	}

	if (offset > 0) {
		offset = offset % steps;
		pattern = rotate(pattern, offset);
	}

	return pattern;
}

function rotate(array, n) {
	return [
		...array.slice(array.length - n),
		...array.slice(0, array.length - n),
	];
}
