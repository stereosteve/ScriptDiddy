/*
		Real-time Quantizer.pst
		
		This pst quantizes incoming NoteOn events to the next division, as set in 
		the Scripter UI. 
		
		Note: The transport must be playing for this effect to work.
		
		Tip: Play slightly before the desired beat, to get real-time quantization.
		
		If a NoteOff event occurs prior to the scheduled NoteOn time, delay the 
		NoteOff event until after the NoteOn event plays, otherwise, send the 
		NoteOff event as played.
*/

//global variables

var DEBUG = true;

var NeedsTimingInfo = true;										//needed for GetTimingInfo()
var lastBlockStart = -1.;									// store last block start for wrap around detection in cycle mode
var CURRENT_DIVISION = 5;									//index of the division
var ACTIVE_NOTES = [];										// array containing all currently playing notes
var DIVISIONS = [											//define divisions for UI menu
		"1/64t",	
		"1/64",   
		"1/32t", 
		"1/32",  
		"1/16t",   
		"1/16",  
		"1/8T",   
		"1/8",    
		"1/4t",	 
		"1/4",   
		"1/2t",  
		"1/2",   
		"1/1",   
];
var TIMES = [ 												//define beat divisions for the 
		0.04166666666667,									//corresponding DIVISIONS index
		0.0625,
		0.08333333333333,
		0.125,
		0.16666666666667,
		0.25,
		0.33333333333333,
		0.5,
		0.66666666666667,
		1,
		1.33333333333333,
		2,
		4,
];

//create UI ------------------------
PluginParameters = [{
		name:"Quantize To Next Division",
		type:"menu",
		valueStrings:DIVISIONS,
		defaultValue:5,
}];

//_____________________________ printActiveNotes () ____________________________
/**
* This function prints the active notes to the console, 
* and is used for debugging purposes.
*/
function printActiveNotes() 
{
	var notes = [];

	for (var i = 0; i < ACTIVE_NOTES.length; i++) 
	{
		notes.push("<" + ACTIVE_NOTES[i].Event.pitch
		+ "|" + " Beat position: "+ACTIVE_NOTES[i].Event.beatPos + ">"); 
	}

	if (notes.length === 0) 
	{
		notes[0] = "empty";
	}
	
	Trace("Active Notes length: "+ACTIVE_NOTES.length);
	Trace("Active Notes: " + notes); Trace("");	
	
} // /printActiveNotes

//___________________________ addToActiveNotes () ______________________________
/**
* This  function adds an event to the ACTIVE_NOTES array. 
*
* @param event is the event to add
* @param hasWrappedAround true if event has wrapped around in a cycle
*/
function addToActiveNotes(event, hasWrapped) 
{

	ACTIVE_NOTES.push({ Event: event, /*Time: Date.now(),*/ HasWrapped: hasWrapped });
	
	if (DEBUG) printActiveNotes();
	
} // /addToActiveNotes

//________________________ resetWrapFlags() ____________________________________
/**
* This  function resets all HasWrapped flags in the ACTIVE_NOTES array.
* It is called by ProcessMIDI() when the cycle wraps around.
*
*/
function resetWrapFlags() 
{	
	var info = GetTimingInfo();
	// for each entry in ACTIVE_NOTES
	for (element in ACTIVE_NOTES) 
	{
		// set HasWrapped to false
		ACTIVE_NOTES[element].HasWrapped = false;
		
		// set beatPos to leftCycleBeat
		ACTIVE_NOTES[element].Event.beatPos = info.leftCycleBeat;		 
	}

	if (DEBUG) Trace("resetWrapFlags()");
	
} // /resetWrapFlags

//________________________ removeFromActiveNotes () ____________________________
/**
* This  function removes an event from the ACTIVE_NOTES array, if the incoming
* event's pitch is present in the array.
*
* @param  event is the event whose pitch to search for in the array
*
* @return the beatPos of the removed event
* @return the wrapped flag of the removed event
*/
function removeFromActiveNotes(event) 
{
	var pitchRemoved = false;
	var beatPosition = -1000;
	var hasWrapped = false;
	
	// search forward for given pitch in ACTIVE_NOTES
	for (var i = 0; i < ACTIVE_NOTES.length; i++) 
	{
		if (ACTIVE_NOTES[i].Event.pitch == event.pitch) 
		{	
			// save beatPos for return		
			beatPosition = ACTIVE_NOTES[i].Event.beatPos;
			hasWrapped = ACTIVE_NOTES[i].HasWrapped;
			
			// remove entry
			ACTIVE_NOTES.splice(i, 1);
			pitchRemoved = true;
			
			break; // remove only the first (oldest) found note
		}
	}
	
	if ((DEBUG) && !pitchRemoved) Trace("removeFromActiveNotes pitch not found");
	if (DEBUG) printActiveNotes();
	
	// return beat position and wrapped flag
	return {Pos: beatPosition, HasWrapped: hasWrapped};
	
} // /removeFromActiveNotes

//________________________ startNote () ________________________________________
/**
* This function quantizes and sends incoming noteOn events and calls 
* addToActiveNotes.
*
* @param event incoming noteOn event
*
*/
function startNote(startEvent)
{
	var info = GetTimingInfo();
	var startBeat = startEvent.beatPos;
	var floorBeat = Math.floor(startBeat);
	var snappedBeat = floorBeat;
	var beatDuration = TIMES[CURRENT_DIVISION];
	var hasWrapped = false;

	//if beat duration is larger than 1 beat, calculate from start of bar
	//instead of start of beat
	if (beatDuration > 1) 
	{
		snappedBeat = floorBeat - ((floorBeat - 1) % info.meterNumerator)
	} 
	
	if (DEBUG) Trace("StartNote floor:"+snappedBeat);
	
	//increment to a beat division that falls after the startBeat
	while (snappedBeat < startBeat) 
	{
		snappedBeat += beatDuration;
	}		
	
	if (DEBUG) Trace("StartNote inc:"+snappedBeat);
	
	// check for right cycle boundary if cycling
	if (info.cycling && (snappedBeat >= info.rightCycleBeat))
	{
		// let note wrap around according to cycle boundaries
		snappedBeat = snappedBeat - info.rightCycleBeat + info.leftCycleBeat; 
		// set hasWrapped flag to true
		hasWrapped = true; 
	}
	
	if (DEBUG) Trace("StartNote wrap:"+snappedBeat);
	
	// store new beat position in startEvent		
	startEvent.beatPos = snappedBeat;
	
	// send the note 
	startEvent.send();	
	
	// add startEvent to ACTIVE_NOTES array 
	addToActiveNotes(startEvent, hasWrapped);
	
} // /startNote

//________________________ stopNote () ________________________________________
/**
* This function sends incoming noteOff events while avoiding sending a noteOff
* before the corresponding noteOn has been sent.
* It calls removeFromActiveNotes to determine the noteOn beat position and to
* remove the note from ACTIVE_NOTES.
*
* @param event incoming noteOff event
*
*/
function stopNote(stopEvent)
{
	// extract timing infos
	var info = GetTimingInfo();
	
	// remove the stopEvent from ACTIVE_NOTES and store Infos
	var removeInfo = removeFromActiveNotes(stopEvent);
	
	if (DEBUG) Trace("removeInfo.Pos:"+removeInfo.Pos+" removeInfo.HasWrapped:"+removeInfo.HasWrapped);
	
	// if the stopEvent has not been played, increment the noteOff's beatPos
	if ((stopEvent.beatPos < removeInfo.Pos)
		|| (removeInfo.HasWrapped && (stopEvent.beatPos > removeInfo.Pos))
		) 
	{
		stopEvent.beatPos = removeInfo.Pos + 0.01;
		if (DEBUG) Trace("Set NoteOff beatPos");
		
	} else {
		//set current beatPos for immediate sending
		stopEvent.beatPos = info.blockEndBeat;
	}
	
	// check for right cycle boundary if cycling
	if (info.cycling && (stopEvent.beatPos >= info.rightCycleBeat))
	{
		// let note wrap around according to cycle boundaries
		stopEvent.beatPos = stopEvent.beatPos - info.rightCycleBeat + info.leftCycleBeat; 
	}
	
	if (DEBUG) {
		Trace("StopNote wrap:"+stopEvent.beatPos);
		Trace("");
	}
	
	// send the noteOff stopEvent 
	stopEvent.send();
	
} // /stopNote


//----------------------------- HandleMIDI() -----------------------------------
/*
		Called for every incoming MIDI event.
		
		Delay the NoteOn events until the next beat division, that has been selected
		in the UI. Track the note and scheduled time.
		
		If the incoming NoteOff occurs before the corresponding scheduled NoteOn has
		been sent, delay the NoteOff event until 1/16th note after the NoteOn. 
		Otherwise, send the NoteOff event as it is triggered.
		
		event = incoming MIDI event
*/
function HandleMIDI (event) 
{
	var info = GetTimingInfo();

	if (info.playing) 
	{		
		//NoteOn ...................................................................
		if (event instanceof NoteOn) 
		{
			startNote(event);
		} 
		//NoteOff ..................................................................
		else if (event instanceof NoteOff) 
		{
			stopNote(event);		
		} 
		//All Other Events .........................................................
		else {
				event.send();
		}		
	} 
	//transport not playing
	else 
	{
		event.send();
	}
} // /HandleMIDI

//-------------------------- ProcessMIDI ----------------------------------------
/* 
	This procedure is called every processing block by the engine. It is used for
	processes which run independent of incoming events.

*/
function ProcessMIDI()
{
	// extract timing infos
	var info = GetTimingInfo();
	
	// if we're cycling and the last block start has a higher value than the current one
	if (info.cycling && (lastBlockStart > info.blockStartBeat))
	{
		// we've wrapped around and need to reset the flags
		resetWrapFlags();
	}
	
	// store last block start
	lastBlockStart = info.blockStartBeat;
	
} // /ProcessMIDI

//----------------------------- ParameterChanged() -----------------------------
/*
		Called whenever a UI element value is changed.

		Set the division to snap to.
		
		param = index of the parameter
		value = the new value
*/
function ParameterChanged (param, value) 
{
	switch (param) 
	{
		case 0:
				CURRENT_DIVISION = value;
				
				// reset everything to avoid hanging notes
				Reset();
				
				break;
		default:
				if (DEBUG) Trace("Unknown parameter ID in ParameterChanged() ID: " + param);
	}
} // /ParameterChanged

//---------------------------------- Reset() -----------------------------------
/*
		Called whenever the transport starts, and when Scripter is bypassed or 
		enabled.
*/
function Reset () 
{
	MIDI.allNotesOff();
	ACTIVE_NOTES = [];
	
	if (DEBUG) Trace("Reset");

} // /Reset