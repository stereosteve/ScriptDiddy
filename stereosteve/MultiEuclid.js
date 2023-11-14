/*
wip sequencer thing somewhat inspired by:
https://www.youtube.com/watch?v=bKkC05h96fk

*/

const SEQ = `
G3:63 D4:32 F3:38 G3:34 D#3:94 D3:36 G3 G2:32 F3:81 D3:29 A#2:54 F2:32 D#2:34 G2:64 C3:38 D#3:52
`;

const NUM_CHANNELS = 3;

var NeedsTimingInfo = true;
// var learnMode = false;
var activeNotes = parseSequence(SEQ);
var cursor = -1;

const channels = [];
const cache = {};

var PluginParameters = [
	{
		name: "Learn",
		type: "checkbox",
		defaultValue: false,
		onChange: () => {
			if (GetParameter("Learn")) {
				activeNotes = [];
				Trace(`LEARN MODE ON`);
			} else {
				printSequence();
			}
		},
	},
	{
		name: "Global Cursor",
		type: "checkbox",
		defaultValue: true,
	},
	{
		name: "Debug",
		type: "momentary",
		onChange: () => {
			channels.forEach((c) => c.debugPatt());
		},
	},
];

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
	OFF: 0,
};

class EuclidChannel {
	constructor(id) {
		this.id = id;
		this.cursor = -1;
		[
			{
				name: `CH ${id}`,
				type: "text",
			},
			{
				name: `Div ${id}`,
				type: "menu",
				valueStrings: Object.keys(TIMES),
				defaultValue: 5,
				onChange: (v) => (this.unit = Object.values(TIMES)[v]),
			},
			{
				name: `Pulses ${id}`,
				type: "linear",
				defaultValue: 5,
				minValue: 1,
				maxValue: 32,
				numberOfSteps: 31,
				onChange: (v) => {
					this.pulses = v;
					// this.updatePatt();
				},
			},
			{
				name: `Step Count ${id}`,
				type: "linear",
				defaultValue: 16,
				minValue: 1,
				maxValue: 32,
				numberOfSteps: 31,
				onChange: (v) => {
					this.steps = v;
					// this.updatePatt();
				},
			},
			{
				name: `Offset ${id}`,
				type: "linear",
				defaultValue: 0,
				minValue: 0,
				maxValue: 32,
				numberOfSteps: 32,
				onChange: (v) => {
					this.offset = v;
					// this.updatePatt();
				},
			},
			{
				name: `Velocity ${id}`,
				type: "linear",
				defaultValue: -1,
				minValue: -1,
				maxValue: 127,
				numberOfSteps: 128,
				onChange: (v) => {
					this.velocity = v;
					// this.updatePatt();
				},
			},
			{
				name: `Note Length ${id}`,
				type: "linear",
				defaultValue: 1,
				minValue: 0,
				maxValue: 10,
				numberOfSteps: 500,
				onChange: (v) => {
					this.noteLength = v;
					// this.updatePatt();
				},
			},
		].forEach((p) => PluginParameters.push(p));
	}

	debugPatt() {
		const { id, pulses, steps, offset } = this;
		if (pulses && steps) {
			this.patt = bjorklundMemo(pulses, steps, offset);
			var txt = formatPatt(this.patt);
			Trace(`${id}: ${txt}`);
		}
	}

	pulsesInBlock(musicInfo) {
		const { id, pulses, steps, offset, unit, noteLength } = this;
		if (!unit) return;
		const patt = bjorklundMemo(pulses, steps, offset);

		const lengthInBeats = this.steps * this.unit;
		// const patt = this.patt;

		const globalCycleStart = Math.floor(musicInfo.blockStartBeat / lengthInBeats) * lengthInBeats;
		let cycleStart = globalCycleStart;

		// if (perNoteTiming) {
		// 	const noteBeatPos = quantizeRepeats ? _quantize(note.beatPos) : note.beatPos;
		// 	const beatsHeld = musicInfo.blockStartBeat - noteBeatPos + 1;
		// 	const didCycles = Math.floor(beatsHeld / lengthInBeats);
		// 	cycleStart = noteBeatPos + didCycles * lengthInBeats;
		// }

		for (let i = 0; i < patt.length; i++) {
			if (!patt[i]) continue;
			let startBeat = i * unit + cycleStart;
			let endBeat = startBeat + unit * noteLength;
			if (musicInfo.cycling && endBeat >= musicInfo.rightCycleBeat) {
				endBeat = musicInfo.leftCycleBeat + (endBeat - musicInfo.rightCycleBeat);
			}

			if (startBeat < musicInfo.blockStartBeat) continue;
			if (startBeat > musicInfo.blockEndBeat) break;

			if (GetParameter("Global Cursor")) {
				cursor++;
				this.cursor = cursor;
			} else {
				this.cursor++;
			}

			// Trace(`${this.id} ${cursor} ${startBeat} ${endBeat}`);
			const note = activeNotes[this.cursor % activeNotes.length];
			let noteOn = new NoteOn(note);
			noteOn.pan = this.pan;
			if (this.velocity > -1) {
				noteOn.velocity = this.velocity;
			}

			// make non-accents quieter
			// if (patt[i] == 1) {
			// 	noteOn.velocity *= GetParameter("Quieting");
			// }
			noteOn.sendAtBeat(startBeat);

			let noteOff = new NoteOff(noteOn);
			noteOff.sendAtBeat(endBeat);
		}
	}
}

// SETUP
for (let id = 0; id < NUM_CHANNELS; id++) {
	channels.push(new EuclidChannel(id + 1));
}

function ParameterChanged(param, value) {
	const details = PluginParameters[param];
	if (details.onChange) details.onChange(value);
}

function HandleMIDI(event) {
	if (GetParameter("Learn") && event instanceof NoteOn) {
		activeNotes.push(event);
	}
	event.send();
}

function ProcessMIDI() {
	var musicInfo = GetTimingInfo();
	if (!musicInfo.playing || GetParameter("Learn")) return;
	channels.forEach((ch) => ch.pulsesInBlock(musicInfo));
}

function parseSequence(seq) {
	return seq
		.trim()
		.replaceAll(/\s+/g, " ")
		.split(" ")
		.map((pair) => {
			const [noteName, velocity] = pair.split(":");
			const n = new NoteOn();
			n.pitch = MIDI.noteNumber(noteName);
			n.velocity = parseInt(velocity) || 70;
			// n.trace();
			return n;
		});
}

function printSequence() {
	const patt = activeNotes.map((n) => `${MIDI.noteName(n.pitch)}:${n.velocity}`).join(" ");
	Trace(patt);
}

function bjorklundMemo(pulses, steps, offset = 0) {
	const key = `${pulses},${steps},${offset}`;
	if (!cache[key]) cache[key] = bjorklund(pulses, steps, offset);
	return cache[key];
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
	return [...array.slice(array.length - n), ...array.slice(0, array.length - n)];
}

function formatPatt(patt) {
	return patt.map((p) => (p == 2 ? "●" : p ? "◒" : "◯")).join(" ");
}

function printAllChannels() {
	Trace(`----------------------------------------`);
	channels.forEach((ch) => ch.debugPatt());
}
