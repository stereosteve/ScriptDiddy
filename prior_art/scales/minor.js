
var scale = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0];
var midinotes = [];
var midinotesFilter = [];

var passthru = 0;
var scalekey = 0;
var filteronly = 0;
var scaletype = 0;

function initMidiNotes() {

    midinotes = [];
    midinotesFilter = [];

    for (var x = 0; x < 144; x += 12) {
        for (var y = 0; y < 12; y++) {
            if (0 == scale[y]) {
                midinotes.push(-1);
                midinotesFilter.push(-1);
            }
            else {
                midinotes.push(x + y);
                midinotesFilter.push(x + y);
            }
        }
    }
}

function initMidiNotesUp() {

    initMidiNotes();

    x = 1;
    while (x < midinotes.length) {
        if (-1 == midinotes[x]) {
            midinotes[x] = midinotes[x - 1];
        }
        x++;
    }
}

function initMidiNotesDown() {

    initMidiNotes();

    x = midinotes.length - 1;

    while (x >= 0) {
        if (-1 == midinotes[x]) {
            midinotes[x] = midinotes[x + 1];
        }
        x--;
    }
}

function initMidiNotesRandom() {

    var randomscale = [];

    initMidiNotes();

    for (var y = 0; y < 12; y++) {
        if (1 == scale[y]) {
            randomscale.push(y);
        }
    }

    for (var x = 0; x < 144; x += 12) {
        for (var y = 0; y < 12; y++) {
            if (-1 == midinotes[y + x]) {
                midinotes[y + x] = randomscale[parseInt(Math.random() * (randomscale.length - 0) + 0)] + x;
            }
        }
    }
}

function ParameterChanged(param, value) {

    switch (param) {
        case 0:
            passthru = value;
            break;

        case 1:
            filteronly = 0;
            scaletype = value;

            switch (value) {
                case 0:
                    initMidiNotes();
                    break;

                case 1:
                    initMidiNotesUp();
                    break;

                case 2:
                    initMidiNotesDown();
                    break;

                case 3:
                    initMidiNotesRandom();
                    break;

                case 4:
                    initMidiNotes();
                    filteronly = 1;
                    break;
            }
            break;

        case 2:
            scalekey = value;
            break;
    }

}

function HandleMIDI(event) {

    var adjustedPitch = 0;

    if (event instanceof Note) 
    { 
      if (1 == passthru) {
          event.send();
      }
      else if (1 == filteronly) {
          adjustedPitch = event.pitch - scalekey;
          if (adjustedPitch < 0) {
              return undefined;
          }
          else if (-1 != midinotesFilter[adjustedPitch]) {
              event.send();
          }
          else {
              return undefined;
          }
      }
      else if (-1 == midinotes[event.pitch]) {
          return undefined;
      }
      else {
          if (0 != scaletype) {
              event.pitch = midinotes[event.pitch];
          }
          event.pitch += scalekey;

          event.send();
      }
    }
    else
    {
        event.send();
    }

}

PluginParameters = [
    {
        name: 'Pass Thru', type: 'menu', valueStrings: ['off', 'on'],
        defaultValue: 0, numberOfSteps: 100
    },
    {
        name: 'Scale Type', type: 'menu', minValue: 0, maxValue: 4, numberOfSteps: 4, defaultValue: 0,
        valueStrings: ["Strict", "Up", "Down", "Random", "Filter"]
    },
    {
        name: 'Key', type: 'menu', minValue: 0, maxValue: 12, numberOfSteps: 12, defaultValue: 0,
        valueStrings: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    }
];
