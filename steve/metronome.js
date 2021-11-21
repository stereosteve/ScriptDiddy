var NeedsTimingInfo = true;
var lastBeat;

function ProcessMIDI() {
    var musicInfo = GetTimingInfo();


    if (!musicInfo.playing) {
        lastBeat = -1;
        return;
    };

    var nextBeat = Math.floor(musicInfo.blockEndBeat);
    if (nextBeat > lastBeat) {
        lastBeat = nextBeat;
        var noteOn = new NoteOn(30);
        // noteOn.pitch = MIDI.normalizeData(noteOn.pitch + randomOctave);
        noteOn.sendAtBeat(nextBeat);

        var noteOff = new NoteOff(noteOn);
        noteOff.beatPos += 1;
        noteOff.send()
    }

}