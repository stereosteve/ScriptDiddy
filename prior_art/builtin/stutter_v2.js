/*
        Stutter v2.pst
    	
        This is an enhanced version of the Stutter.pst which allows far more control
        in creating and performing stutters. Instead of a single pair of controls,
        you are given multiple groups of these controls, so that you can jump to
        different "preset" stutters. 
    	
        "Select Group With" defines how stutter groups are selected:
            - "Group Select" Slider will use the group # that is currently selected
               with the slider of the same name. This allows you to dynamically sweep
               through the groups in real time, "performing" your stutters with a 
               single parameter. A value of 0 will apply no stutter, and is in effect
               a bypass. All incoming notes will be stuttered.
               
            - Articulation ID selects the group # by the corresponding Articulation ID
              (the Articulation ID can be set per note, via the Event editor. To view
              Articulation ID data in the Event editor, go to View>Articulation ID)
              When this mode is selected, there are 2 ways that stutters can function,
              and this is set by the "Articulation ID Stutters" menu:
                        - "Only The Notes With An ID" will only apply the stutter effect to
                          notes that have an articulation ID (that isn't 0). This means you
                          could stutter a single drum hit in a pattern, by only setting the
                          articulation ID for that specific hit. All other notes that are 
                          playing will not be effected.
                        - "All Incoming Notes" will apply the stutter effect to all notes. 
                          The last used stutter group, will be applied to all incoming notes.
                          The default group is 1, so if no articulation ID is supplied,
                          the settings from group 1 will be used. 
                          
            - Random will randomly choose a group for every incoming MIDI note
                          
        - Velocity Mode controls how the stuttered notes velocities are set:
            - "As Played" will apply the same incoming velocity to all stutters
            - "Follow  Slider" will set all stutter velocities to the value that is
                defined with the "Stutter Velocity" slider.
            - "Ramp From Original To Slider" will increment the velocity, in equal 
              steps, from the incoming velocity, to the value that is set with the
              "Stutter Velocity" slider. Use this to add more dynamics to your 
              stutters.
            - "Ramp From Slider To Original" works the same way, but in an inverted 
               manner, offering a different type of sound. 
               
        - RANDOMIZE! button will apply random values to all stutter groups, allowing
          you to quickly experiment with different settings.			  	
          
        - Add Group will dynamically add a new group of Stutter and Repeats controls 
          to the UI, and update the Group Select range.
         
        - Remove Group will dynamically remove the last group from the UI and update
        the Group Select range. If you remove a group, it's settings are lost and
        will not be restored when adding a new group.
               
        And finally, this PST is fully scalable. Change the value of 
        NUMBER_OF_STUTTERS to any positive number, and rerun the script. You will 
        now have that number of groups to select from. 
    	
*/

//user customizable variable ----------------------------------------------------
var NUMBER_OF_STUTTERS = 4;     //number of Stutter groups to create. Change this 
//value to add/remove groups

var ResetParameterDefaults = false; //flag that tells Scripter whether of not it 
//should reset the UI controls to their default
//values, when rerunning the script.

var FILTER_ID = true;           //when set to true, the incoming Art ID will be 
//thrown away, so that it is not passed on to the
//next plugin or instrument. if false, the ID
//will remain in the NoteOn event. Try adding 
//another instance of Stutter v2 after this one,
//with Select Stutter With, set to Articulation 
//ID, for cumlitive, crazy stutters!


//global variables --------------------------------------------------------------
var MODE = 0;                   //0 = Slider
//1 = Articulation ID
//2 = Random 


var SLIDER_VALUE = 1;           //Stutter group to use when in slider mode

var ART_ID_MODE = 1;            //0 = Only The Notes With An ID
//1 = All Incoming Notes

var STUTTER_VELOCITY = 96;      //Value of the Stutter Velocity slider

var VELOCITY_MODE = 0;          //0 = As Played
//1 = Follow Slider
//2 = Ramp From Original To Slider
//3 = Ramp From Slider To Original

var PREVIOUS_GROUP_INDEX = 1;   //The last stutter group that was used

var NUM_GLOBAL_CONTROLS = 9;

var PARAMS_TO_ADD = [];
var PARAMS_TO_REMOVE = [];
var GROUP_NUMBER = NUMBER_OF_STUTTERS;

var NeedsTimingInfo = true;         //Need to access GetTimingInfo()


//------------------------------ HandleMIDI() -----------------------------------
/*
        HandleMIDI() is called for every incoming MIDI event.
    	
        If the event is a NoteOn event, perform the appropriate stutter, as is
        set by the various modes and settings.
*/
function HandleMIDI(event) {

    if (event instanceof NoteOn) {

        //array to hold stutter and repeats values
        var groupValues;

        var artID = event.articulationID;

        if (FILTER_ID) {
            event.articulationID = 0;
        }

        event.send();

        switch (MODE) {
            //slider ---------------------------------------------------------------
            case 0:
                if (SLIDER_VALUE > 0) {
                    groupValues = getGroupValues(SLIDER_VALUE);
                    stutter(event, groupValues[0], groupValues[1]);
                }
                break;
            //articulation ID ------------------------------------------------------
            case 1:
                //Only The Notes With An Assigned ID
                if (ART_ID_MODE === 0) {
                    //only stutter notes that have Articulation IDs
                    if (artID > 0
                        && artID <= GROUP_NUMBER) {
                        groupValues = getGroupValues(artID);
                        stutter(event, groupValues[0], groupValues[1]);
                    }
                    //show alert if incoming Art ID is greater than # of groups
                    else if (artID > GROUP_NUMBER) {
                        Trace("Error: Articulation ID <" + artID
                            + "> is great than number of Stutter Groups");
                    } else {
                        //do nothing for events without a valid articulationID
                    }
                }
                //all incoming notes
                else {
                    //if a note has an articulation ID update the PREVIOUS variables
                    if (artID > 0
                        && artID <= GROUP_NUMBER) {
                        groupValues = getGroupValues(artID);
                        PREVIOUS_GROUP_INDEX = artID;
                    }
                    //show alert if incoming Art ID is great than # of groups
                    else if (artID > GROUP_NUMBER) {
                        Trace("Error: Articulation ID < " + artID
                            + " > is great than number of Stutter Groups");
                    }
                    //if no ID is specified
                    else {
                        //use the last articulation ID
                        groupValues = getGroupValues(PREVIOUS_GROUP_INDEX);
                    }

                    if (groupValues) {
                        stutter(event, groupValues[0], groupValues[1]);
                    }
                }

                break;
            //random ---------------------------------------------------------------
            case 2:
                var randomGroup =
                    Math.round(Math.random() * (GROUP_NUMBER - 1)) + 1;
                var groupValues = getGroupValues(randomGroup);
                stutter(event, groupValues[0], groupValues[1]);
                break;
            default:
                Trace("Error in HandleMIDI()");
        }
    }
    //all other events
    else {
        event.send();
    }
}

//----------------------------- ParameterChanged() ------------------------------
/*
        ParameterChanged() is called whenever a UI element is changed.

        If the control is a global control, update the corresponding global variable.
        If RANDOMIZE! is pressed, cycle through all group values, and randomize them.
        All group values are updated in the getGroupValues() call, in HandleMIDI().
        If Add or Remove Group is pressed, schedule the addition or removal of 
        controls for a group, which will be handled in the Idle() function.		
*/
function ParameterChanged(param, value) {
    //if param is a global control, update the related global variables
    if (param <= NUM_GLOBAL_CONTROLS - 1) {
        switch (param) {
            case 1:
                MODE = value;
                break;
            case 2:
                SLIDER_VALUE = value;
                break;
            case 3:
                ART_ID_MODE = value;
                break;
            case 4:
                VELOCITY_MODE = value;
                break;
            case 5:
                STUTTER_VELOCITY = value;
                break;
            //RANDOMIZE! button
            case 6:
                //when enabled
                if (value === 1) {
                    for (var i = 6; i < PluginParameters.length; i++) {
                        var min = PluginParameters[i].minValue;
                        var max = PluginParameters[i].maxValue;
                        var randomValue =
                            Math.round(Math.random() * (max - min) + min);
                        SetParameter(i, randomValue);
                    }
                    //set button to disabled
                    SetParameter(6, 0);
                }
                break;
            //Add Group
            case 7:
                if (value === 1) {

                    GROUP_NUMBER++;

                    PARAMS_TO_ADD.push({
                        name: "------ Group " + GROUP_NUMBER + " ------",
                        type: "text"
                    }, {
                        name: "(" + GROUP_NUMBER + ") Stutter",
                        type: "linear",
                        minValue: 1,
                        maxValue: 12,
                        numberOfSteps: 11,
                        defaultValue: getDefaultStutterForGroup(GROUP_NUMBER)
                    }, {
                        name: "(" + GROUP_NUMBER + ") Repeats",
                        type: "linear",
                        minValue: 1,
                        maxValue: 12,
                        numberOfSteps: 11,
                        defaultValue: getDefaultRepeatsForGroup(GROUP_NUMBER),
                    });

                    SetParameter(7, 0);
                }
                break;
            //Remove Group
            case 8:
                if (value === 1) {
                    PARAMS_TO_REMOVE.push(PluginParameters.length - 1);
                    PARAMS_TO_REMOVE.push(PluginParameters.length - 2);
                    PARAMS_TO_REMOVE.push(PluginParameters.length - 3);
                    SetParameter(8, 0);
                }
                break;
            default:
                Trace("Error In ParameterChanged()");
        }
    }
}

//--------------------------------- Idle () -------------------------------------
/*
        Idle() is a built-in Scripter function that gets called several times per 
        second. Use this function to update UI elements, without affecting the 
        performance of the script.
    	
*/
function Idle() {

    if (PARAMS_TO_ADD.length > 0) {

        for (var i = 0; i < PARAMS_TO_ADD.length; i++) {
            PluginParameters.push(PARAMS_TO_ADD[i]);
        }

        PARAMS_TO_ADD = [];
        PluginParameters[2].maxValue = GROUP_NUMBER;
        PluginParameters[2].numberOfSteps = GROUP_NUMBER;
        UpdatePluginParameters();
    }

    if (PARAMS_TO_REMOVE.length > 0) {
        var removeCanceled = false;

        for (var i = 0; i < PARAMS_TO_REMOVE.length; i++) {

            var paramIndex = PARAMS_TO_REMOVE[i];

            if (GROUP_NUMBER === 1) {
                PARAMS_TO_REMOVE = [];
                removeCanceled = true;

                Trace("Remove Group failed: There must be at least one group.");
                break;
            }

            var removedItem = PluginParameters.splice(paramIndex, 1);
        }

        if (!removeCanceled) {
            GROUP_NUMBER--;
        }

        PARAMS_TO_REMOVE = [];
        PluginParameters[2].maxValue = GROUP_NUMBER;
        PluginParameters[2].numberOfSteps = GROUP_NUMBER;
        UpdatePluginParameters();
    }
}


//------------------------------ getGroupValues() -------------------------------
/*
        This function retrieves the Stutter and Repeats values for a specified 
        group #. The values are returned in an array, with index 0 = stutter and 
        index 1 = repeats
    	
        groupNumber is the stutter group you are retrieving the values for. This
        should be a value between 1 and NUMBER_OF_STUTTERS
    	
        returns an array with the stutter and repeats values for the specifed group
*/
function getGroupValues(groupNumber) {
    var valueArray = [];

    //index of the last global control
    var baseOffset = NUM_GLOBAL_CONTROLS - 1;

    //the base group offset
    var groupOffset = (groupNumber - 1) * 3;

    //the index of the repeats control
    var index = (baseOffset + groupOffset) + 2;

    valueArray[0] = GetParameter(index);
    valueArray[1] = GetParameter(index + 1);

    return valueArray;
}

//---------------------------------- stutter() ----------------------------------
/*
        This function takes an incoming NoteOn event and performs a sutter effect,
        based on the specified stutter and repeats settings. The velocity of the 
        stuttered notes depend on the global velocity mode, and stutter velocity
        values. 
    	
        noteOn = the incoming NoteOn event that should be stuttered
        stutter = the stutter value 
        repeats = the repeats value
*/
function stutter(noteOn, stutter, repeats) {
    var info = GetTimingInfo();
    var secondsPerBeat = 1 / (info.tempo / 60);
    var rollBase = secondsPerBeat * 1000;
    var rollTime = rollBase / Math.pow(2, stutter) * repeats;

    var originalVelocity = noteOn.velocity;

    if (stutter > 0) {
        for (i = 0; i < stutter; i++) {
            var rollIteration = rollTime + (rollTime * i);
            var rollTotal = rollIteration;

            switch (VELOCITY_MODE) {
                case 0:
                    //use original velocity
                    break;
                case 1:
                    noteOn.velocity = STUTTER_VELOCITY;
                    break;
                case 2:
                    var range = originalVelocity - STUTTER_VELOCITY;
                    var step = range / stutter;
                    noteOn.velocity = originalVelocity - (step * (i + 1));
                    break;
                case 3:
                    var range = originalVelocity - STUTTER_VELOCITY;
                    var step = range / stutter;
                    noteOn.velocity = STUTTER_VELOCITY + (step * (i + 1));
                    break;
                default:
                    Trace("Error in stutter velocity");
            }

            noteOn.velocity = MIDI.normalizeData(noteOn.velocity);

            //if global variable is set to filter out incoming Articulation IDs
            if (FILTER_ID) {
                //remove the articulation ID, so that it is not passed along to
                //the next plugin or instrument
                noteOn.articulationID = 0;
            }

            noteOn.sendAfterMilliseconds(rollTotal);
            var noteOff = new NoteOff(noteOn);
            noteOff.sendAfterMilliseconds(rollTotal + 1);
        }
    }
}

//---------------------------- create the UI controls ---------------------------

//create global controls --------------------------------------------------------
var PluginParameters = [{
    name: "------ Global Controls ------",
    type: "text"
}, {
    name: "Select Group With",
    type: "menu",
    valueStrings: [
        "\"Group Select\" Slider",
        "Articulation ID",
        "Random"
    ],
    numberOfSteps: 2,
    defaultValue: 0
}, {
    name: "Group Select",
    type: "linear",
    minValue: 0,
    maxValue: NUMBER_OF_STUTTERS,
    numberOfSteps: NUMBER_OF_STUTTERS,
    defaultValue: 1
}, {
    name: "Articulation ID Stutters",
    type: "menu",
    valueStrings: [
        "Only The Notes With An ID",
        "All Incoming Notes"
    ],
    numberOfSteps: 1,
    defaultValue: 0,

}, {
    name: "Velocity Mode",
    type: "menu",
    valueStrings: [
        "As Played",
        "Follow Slider",
        "Ramp From Original To Slider",
        "Ramp From Slider To Original"],
    numberOfSteps: 3,
    defaultValue: 0

}, {
    name: "Stutter Velocity",
    type: "linear",
    minValue: 1,
    maxValue: 127,
    numberOfSteps: 126,
    defaultValue: 96
}, {
    name: "RANDOMIZE!",
    type: "checkbox",
    defaultValue: 0
}, {
    name: "Add Group",
    type: "checkbox",
    defaultValue: 0,
    disableAutomation: true
}, {
    name: "Remove Group",
    type: "checkbox",
    defaultValue: 0,
    disableAutomation: true
}];

function getDefaultStutterForGroup(group) {
    return (group * 2) % 12;
}

function getDefaultRepeatsForGroup(group) {
    return group % 12;
}

//create stutter group controls -------------------------------------------------
for (var i = 0; i < NUMBER_OF_STUTTERS; i++) {

    PluginParameters.push({
        name: "----- Group " + (i + 1) + " ------",
        type: "text"
    }, {
        name: "(" + (i + 1) + ") Stutter",
        type: "linear",
        minValue: 1,
        maxValue: 12,
        numberOfSteps: 11,
        defaultValue: getDefaultStutterForGroup(i + 1)
    }, {
        name: "(" + (i + 1) + ") Repeats",
        type: "linear",
        minValue: 1,
        maxValue: 12,
        numberOfSteps: 11,
        defaultValue: getDefaultRepeatsForGroup(i + 1)
    });
}