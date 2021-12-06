var NeedsTimingInfo = true;

// timing unit "atom"
// .25 = 1/16
var unit = .25
var pulses = 3
var stepCount = 16
var offset = 0
var patt
var lengthInBeats
var activeNotes = []



var TIMES = {
  "1/16": .25,
  "1/8": .5,
  "1/4": 1,
}


// unit: 1/16, 1/8, 1/4
// multiplier: 1x
// steps: 1-100
// offset: 1-100
// accents: x- x-- x--- -x -x- -xx
var PluginParameters = [
  {
    name: "Time", type: "menu",
    valueStrings: Object.keys(TIMES),
    defaultValue: 5
  },
  {
    name: "Pulses", defaultValue: 7, minValue: 1, maxValue: 32,
    numberOfSteps: 31, type: "linear"
  },
  {
    name: "Step Count", defaultValue: 16, minValue: 1, maxValue: 32,
    numberOfSteps: 31, type: "linear"
  },
  {
    name: "Offset", defaultValue: 0, minValue: 0, maxValue: 32, type: "linear", numberOfSteps: 32,
  },
  {
    name: "Display", type: "menu", valueStrings: ['', '']
  },
];

function ParameterChanged(param, value) {
  const details = PluginParameters[param]
  switch (param) {
    case 0:
      unit = Object.values(TIMES)[value]
      break;
    case 1:
      pulses = value;
      break;
    case 2:
      stepCount = value;
      break;
    case 3:
      offset = value;
      break;
  }

  Trace(`${details.name}: ${value}`);
  lengthInBeats = stepCount * unit
  patt = bjorklund(pulses, stepCount, offset)
  
  
  const pattStr = patt.join(' ')
  if (PluginParameters[4].valueStrings[0] != pattStr) {
    PluginParameters[4].valueStrings[0] = pattStr
    UpdatePluginParameters()
    Trace(pattStr)
  }



}

function HandleMIDI(note) {
  note.trace();
  if (note instanceof NoteOn) {
    activeNotes.push(note)
  }

  if (note instanceof NoteOff) {
    for (var i in activeNotes) {
      if (activeNotes[i].pitch == note.pitch) {
        activeNotes.splice(i, 1);
      }
    }
  }
}


function ProcessMIDI() {
  var musicInfo = GetTimingInfo();

  for (let note of activeNotes) {
    const cycleStart = Math.floor(musicInfo.blockStartBeat / lengthInBeats) * lengthInBeats
    for (let i = 0; i < patt.length; i++) {
      if (!patt[i]) continue;
      let startBeat = ((i + 1) * unit) + cycleStart
      let endBeat = startBeat + unit
      if (musicInfo.cycling && endBeat >= musicInfo.rightCycleBeat) {
        endBeat = musicInfo.leftCycleBeat + (endBeat - musicInfo.rightCycleBeat)
      }

      if (startBeat < musicInfo.blockStartBeat) continue;
      if (startBeat > musicInfo.blockEndBeat) break;

      let noteOn = new NoteOn(note);
      noteOn.sendAtBeat(startBeat)

      let noteOff = new NoteOff(noteOn);
      noteOff.sendAtBeat(endBeat);
    }
  }

}



function bjorklund(pulses, steps, offset = 0) {
  if (steps === 0) {
    throw new RangeError('steps must be greater than 0')
  }

  if (pulses === 0) {
    return Array(steps).fill(0)
  }

  pulses = pulses >= steps ? steps : pulses

  let pattern = []
  const counts = []
  const remainders = []
  let divisor = steps - pulses
  let level = 0

  remainders.push(pulses)

  while (true) {
    counts.push(Math.floor(divisor / remainders[level]))
    const nextRemainder = divisor % remainders[level]
    remainders.push(nextRemainder)
    divisor = remainders[level]
    level++

    if (remainders[level] <= 1) {
      break
    }
  }

  counts.push(divisor)

  const build = level => {
    if (level === -1) {
      pattern.push(0)
    } else if (level === -2) {
      pattern.push(1)
    } else {
      for (let i = 0; i < counts[level]; i++) {
        build(level - 1)
      }
      if (remainders[level] !== 0) {
        build(level - 2)
      }
    }
  }

  build(level)

  const firstOn = pattern.indexOf(1)

  if (firstOn > -1) {
    pattern = [...pattern.slice(firstOn), ...pattern.slice(0, firstOn)]
  }

  if (offset > 0) {
    offset = offset % steps
    pattern = rotate(pattern, offset)
  }

  return pattern
}

function rotate(array, n) {
  return [...array.slice(array.length - n), ...array.slice(0, array.length - n)]
}