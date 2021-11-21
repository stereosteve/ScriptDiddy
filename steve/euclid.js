var NeedsTimingInfo = true;

const patternLength = 8;
let cycleNumber = -1;
let wasPlaying = false;

const hits = []

// 3, 8
bjorklund(3, 8).forEach((on, i) => {
    if (on) {
        hits.push({at: i + 1, pitch: 33, duration: 1})
    }
})

bjorklund(5, 8).forEach((on, i) => {
    if (on) {
        hits.push({at: i + 1, pitch: 55, duration: 1})
    }
})


function ProcessMIDI() {
    var musicInfo = GetTimingInfo();

    if (musicInfo.playing && !wasPlaying){
        onStart()
    }  
  
    if(!musicInfo.playing && wasPlaying) {
        onStop()
        return;
    }

    if (!musicInfo.playing) {
        return
    }

    const nextCycle = Math.floor(musicInfo.blockStartBeat / patternLength) * patternLength
    if (nextCycle == cycleNumber) {
        return;
    }

    cycleNumber = nextCycle

    for (let h of hits) {
        let startBeat = cycleNumber + h.at
        let endBeat = startBeat + h.duration

        let noteOn = new NoteOn();
        noteOn.pitch = h.pitch;
        noteOn.sendAtBeat(startBeat)

        let noteOff = new NoteOff(noteOn);
        noteOff.sendAtBeat(endBeat);
    }


}



function onStart() {
    Trace("on start")
    wasPlaying = true
}


function onStop() {
    Trace("on stop")
    wasPlaying = false
    cycleNumber = -1
    MIDI.allNotesOff(); 
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