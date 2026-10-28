/* 

a:zak45
d:25/01/2023
v:2.1.0

Chataigne Module for  WLED Sound Reactive
Send sound card audio data via UDP.
This script will take Audio data provided by Chataigne and try to map them to WLED values.
It also provide some real time sound data analysis (e.g Pitch, FFT, BPM, etc..).


    Classical (Classique) : 60-120 BPM
    Jazz : 80-140 BPM
    Blues : 60-120 BPM
    Rock : 100-160 BPM
    Pop : 90-130 BPM
    R&B : 60-100 BPM
    Hip Hop : 60-100 BPM
    Electronic (EDM, Trance, House) : 120-140 BPM (varie selon les sous-genres)
    Country : 60-120 BPM
    Reggae : 70-100 BPM
    Funk : 90-120 BPM
    Metal : 100-200 BPM (varie selon les sous-genres)
    Punk : 150-200 BPM
    Salsa : 150-250 BPM
    Ballad : 60-80 BPM



 Names of frequency responses
	20 - 40 Hz			Low Bass
	40 - 80 Hz			Mid Bass
	80 - 160 Hz			Upper Bass
	160 - 320 Hz		Lower Midrange
	320 - 640 Hz		Middle Midrange
	640 Hz - 1.28 кHz	Upper Midrange
	1.28 - 2.56 кHz		Lower Treble
	2.56 - 5.12 кHz		Middele Treble
	5.12 - 10.2 кHz		Upper Treble
	10.2 - 20.4 кHz		Top Octave

The UDP  Multicast  IP is 239.0.0.1, and the default UDP port is 11988.

// From WLED Infos
UDP port can be changed in WLED config pages, for example to have several groups of devices by assigning different UDP ports to each group.
the software sends/receives one packet every 20 milliseconds (approx). An external sender may be slower, but not faster than 20ms = 50fps
//

-------------------------------------- BIN -----------------  
  
  //                                               Range
      fftCalc[0] = (fftAdd(3,4)) /2;        // 60 - 100
      fftCalc[1] = (fftAdd(4,5)) /2;        // 80 - 120
      fftCalc[2] = (fftAdd(5,7)) /3;        // 100 - 160
      fftCalc[3] = (fftAdd(7,9)) /3;        // 140 - 200
      fftCalc[4] = (fftAdd(9,12)) /4;       // 180 - 260
      fftCalc[5] = (fftAdd(12,16)) /5;      // 240 - 340
      fftCalc[6] = (fftAdd(16,21)) /6;      // 320 - 440
      fftCalc[7] = (fftAdd(21,28)) /8;      // 420 - 600
      fftCalc[8] = (fftAdd(28,37)) /10;     // 580 - 760
      fftCalc[9] = (fftAdd(37,48)) /12;     // 740 - 980
      fftCalc[10] = (fftAdd(48,64)) /17;    // 960 - 1300
      fftCalc[11] = (fftAdd(64,84)) /21;    // 1280 - 1700
      fftCalc[12] = (fftAdd(84,111)) /28;   // 1680 - 2240
      fftCalc[13] = (fftAdd(111,147)) /37;  // 2220 - 2960
      fftCalc[14] = (fftAdd(147,194)) /48;  // 2940 - 3900
      fftCalc[15] = (fftAdd(194, 255)) /62; // 3880 - 5120  // avoid the last 5 bins, which are usually inaccurate
  //
  
      fftCalc[ 0] = fftAddAvg(1,2);               // 1    43 - 86   sub-bass
      fftCalc[ 1] = fftAddAvg(2,3);               // 1    86 - 129  bass
      fftCalc[ 2] = fftAddAvg(3,5);               // 2   129 - 216  bass
      fftCalc[ 3] = fftAddAvg(5,7);               // 2   216 - 301  bass + midrange    
  
      fftCalc[ 4] = fftAddAvg(7,10);                // 3   301 - 430  midrange
      fftCalc[ 5] = fftAddAvg(10,13);               // 3   430 - 560  midrange
      fftCalc[ 6] = fftAddAvg(13,19);               // 5   560 - 818  midrange
      fftCalc[ 7] = fftAddAvg(19,26);               // 7   818 - 1120 midrange -- 1Khz should always be the center !
      fftCalc[ 8] = fftAddAvg(26,33);               // 7  1120 - 1421 midrange
      fftCalc[ 9] = fftAddAvg(33,44);               // 9  1421 - 1895 midrange
      fftCalc[10] = fftAddAvg(44,56);               // 12 1895 - 2412 midrange + high mid
      fftCalc[11] = fftAddAvg(56,70);               // 14 2412 - 3015 high mid
      fftCalc[12] = fftAddAvg(70,86);               // 16 3015 - 3704 high mid
      fftCalc[13] = fftAddAvg(86,104);              // 18 3704 - 4479 high mid
      fftCalc[14] = fftAddAvg(104,165) * 0.88f;     // 61 4479 - 7106 high mid + high  -- with slight damping
		// don't use the last bins from 216 to 255. They are usually contaminated by aliasing (aka noise) 
	  fftCalc[15] = fftAddAvg(165,215) * 0.70f;   // 50 7106 - 9259 high             -- with some damping	  
  
  
*/

// sound Card
var SCexist = false;

// osc
var OSCModule = null;
var OSCIP = "127.0.0.1";

// TMPDIR
var tempDIR = "";

//HOME Location
//%USERPROFILE% for WIN and $HOME for others
var homeDIR = "";
var winHOME = "";

// Volume
var wledVol = 0;
// Volume Multiplier
var volMultiplier = 512;

// Global FFT Multiplier
var fftMultiplier = 254;
// FFT Data
var FFTWLED = [];
// FFT Max Freq / Magnitude
var fftSoundMaxFreqMagnitude = 0;
var fftSoundMaxFreqIndex = 0;
// FFT Mode
var fftMode = "";
//minAudio/max DB
var minDB = -50;
var maxDB = 0;
// Frequence table
var FREQTABLE = [];

// samplePeak
var wledPeak = 0;

// WLED 0.15 : smoothed volume (sampleSmth / volumeSmth), same filter as WLED : avg over last 16 samples
var wledSmth = 0;
// WLED 0.15 : bass onset peak detection
var bassAvg = 0;
var lastPeakTime = 0;
var lastBeatValue = false;

// Wled Freq/Mag
var wledFreq = 0;
var wledMag = 0;

// UDP
var multicastIP = "239.0.0.1";
var	uDPPort = 11988;
var myIP = "127.0.0.1";

// Init Flag
// to made some logic only once at init
var isInit = true;

// snapshot
var snapshot = false;

//replay 
var replay = false;
var duration = 0;
var previousFile = "";
var SOUNDDATA = [];

// UDP Data
var  UDP_AUDIO_SYNC = [];
var  UDP_AUDIO_SYNC_V2 = [];

// BPM
var aubioCmdName = "aubio.cmd";
var aubioProcName = "WLEDAudioSyncRTBeat";

// Friture
var fritureCmdName = "friture.cmd";
// RTMGC
var rtmgcCmdName = "rtmgc.cmd";
var rtmgcProcName = "WrtmgcSRV";
// RTMMD
var rtmmdCmdName = "rtmmd.cmd";
// multicast
var multicastCmdName = "multicast.cmd";

// module
var moduleDIR = "/Chataigne/modules/WLEDAudioSync/";

var options = "";

// SCAnalyzer test
var SCAModule = false;

//We create necessary entries in module.
function init ()
{
	script.log("-- Custom command called init()");	

	local.scripts.wLEDAudioSync.updateRate.setAttribute("readOnly",false);

	var infos = util.getOSInfos(); 
	script.log("Hello "+infos.username);	
	script.log("We run under : "+infos.name);
	
	if ( infos.name.contains("Win") )
	{
		homeDIR = util.getEnvironmentVariable("USERPROFILE") + "/Documents";
		winHOME = util.getEnvironmentVariable("USERPROFILE");
		
	} else {
		
		homeDIR = util.getEnvironmentVariable("$HOME");
	}
	
	// update rate (no more than 50fps but let choice)
	script.setUpdateRate(50);
}


function update ()
{
	
	// Send audio data and return
	if (SCexist && 
		root.modules.soundCard.values.volume.get()!= 0 && 
		replay === false && 
		local.parameters.live.get() == 1 && 
		local.parameters.beatParams.syncToBeat.get() == 0
		)
	{
		sendAudio(false);
		
		return;
		
	} else if (replay === true){
		
		if ( duration > 0 )
		{
			sendAudio(true);
			
		} else {

			replay = false;
			
			for ( var k = 0; k < 10; k += 1 )
			{
				sendAudio(false);	
			}
			
			script.setUpdateRate(50);
		}
		
		return;
	}
	
	// Initialize only once some Params when script run for first time
	if (isInit === true)
	{
		script.log('Initialize');

		isInit = false;
		
		// Module test 
		
		OSCModule = root.modules.getItemWithName("OSC");
		SCAModule = root.modules.getItemWithName("SCAnalyzer");	
		
		if (OSCModule.name == "osc")
		{
			script.log("Module OSC exist");
			
		} else {
				
			script.log("Module OSC do not exist");
				
		}

		if (SCAModule.name != "undefined")
		{
			script.log("Module SCAnalyzer exist");
			
		} else {
				
			script.log("Module SCAnalyzer does not exist");
				
		}	

		if (checkModuleExist("OS"))
		{
			script.log("Module OS exist");
			
		} else {
				
			root.modules.addItem("OS");
		}


		if (checkModuleExist("Sound Card"))
		{	
			script.log("Sound Card present");
			SCexist = true;
			
		} else {
				
			script.log("No Sound Card present");
			var newSCModule = root.modules.addItem("Sound Card");
			if (newSCModule.name != "undefined")
			{
				SCexist = true;
				
			} else {
				
				SCexist = false;
			}
		}

		if (SCexist === true) 
		{
			root.modules.soundCard.parameters.pitchDetectionMethod.set("MPM");
			root.modules.soundCard.parameters.activityThreshold.set(0.075);
		}

		// if run from portable version need to set right script path
		// and execute BPM if not running
		if (local.parameters.beatParams.useBPM.get() == 1)
		{
			var checkProcess = root.modules.os.getRunningProcesses("*");
			var aubioIsRunning = false;
			var aubioProcessName = "";
			var aubiodevice = local.parameters.beatParams.inputAudio.get();
			if (aubiodevice == null)
			{
				aubiodevice = 0;
			}
			
			addOSCScript('OSCBPM');
			root.modules.osc.scripts.oscbpm.reload.trigger();		

			for ( var i = 0; i < checkProcess.length; i ++)
			{
				if (checkProcess[i].contains(aubioProcName))
				{
					aubioIsRunning = true;
					aubioProcessName = checkProcess[i];
					script.log("aubio is running");
					break;
				}				
			}

			if (aubioIsRunning === false ) {
				options = 	" beat -s " + OSCIP + " " + root.modules.osc.parameters.oscInput.localPort.get() + ' "/WLEDAudioSync/beat/BPM"' + 
							" -d " + aubiodevice +
							" -b " + local.parameters.beatParams.aubioBuffer.get();
				var command = homeDIR + moduleDIR + aubioCmdName + options;
				script.log("command to run : " + command);		
				root.modules.os.launchCommand(command, true);	
			}
		}
		
		// retreive all IPs
		var ips = util.getIPs();
		local.parameters.ipAddressToBind.removeOptions();
		
		for( var i=0; i<ips.length; i +=1 ) 
		{ 
			local.parameters.ipAddressToBind.addOption(ips[i],i);
		}		
		
		local.parameters.ipAddressToBind.set(root.modules.os.values.networkInfos.ip.get());
		multicastIP = local.parameters.output.remoteHost.get();;
		uDPPort = local.parameters.output.remotePort.get();
		myIP = local.parameters.ipAddressToBind.get();
		
		// MultiCast
		testMultiCast();

		// if no FFT then create FFT : new
		var testFFT = root.modules.soundCard.parameters.fftAnalysis.getItemWithName("Analyzer 1");
		if (testFFT.name != "undefined") 
		{
			script.log("FFT already there !!");
			
		} else {
			
			createWLEDFFT(false);
			root.modules.soundCard.parameters.fftAnalysis.enabled.set(1);
			
		}

		// Remove read only from rate
		local.scripts.wLEDAudioSync.updateRate.setAttribute("readOnly",false);
		
		// add WLEDAudioSync to SCAnalyzer options
		if (SCAModule.name != "undefined")
		{
			SCAModule.parameters.wLEDAudioSyncParams.moduleName.addOption(local.name, local.name);	
			var mycontainer = SCAModule.parameters.getChild("WLEDAudioSync Params");
			mycontainer.setCollapsed(false);			
		}		
		
		// end
	}
}

// check modifications made on module Params
function moduleParameterChanged (param)
{	
	script.log("Param changed : "+param.name);
	
	if (param.name == "volumeMultiplier")
	{
		volMultiplier = local.parameters.volumeMultiplier.get();
		
	} else if (param.name == "frequencyMagnitudeMultiplier"){
		
		fftMultiplier = local.parameters.frequencyMagnitudeMultiplier.get();
		
	} else if (param.name == "remoteHost"){
		
		multicastIP = local.parameters.output.remoteHost.get();
		
	} else if (param.name == "remotePort"){
		
		uDPPort = local.parameters.output.remotePort.get();
		
	} else if  (param.name == "ipAddressToBind"){
		
		myIP = local.parameters.ipAddressToBind.get();
		
	} else if (param.name == "sendTestMessage"){
		
		testMultiCast();
		
	} else if (param.name == "local"){
		
		if (local.parameters.output.local.get() == 1){
			
			multicastIP = "127.0.0.1";
			
		} else {
			
			multicastIP = local.parameters.output.remoteHost.get();
			
		}
		
	} else if (param.name == "takeSnapshot"){
		
		snapshot = true;
	
	} else if (param.name == "useBPM" && isInit === false){
		

		var checkProcess = root.modules.os.getRunningProcesses("*");
		var aubioIsRunning = false;
		var aubioProcessName = "";
		
		for ( var i = 0; i < checkProcess.length; i ++)
		{
			if (checkProcess[i].contains(aubioProcName))
			{
				aubioIsRunning = true;
				aubioProcessName = checkProcess[i];
				script.log("aubio is running");
				break;
			}				
		}

		addOSCScript("OSCBPM");
		
		if (local.parameters.beatParams.useBPM.get() == 1)
		{
			// find aubio devices list
			aubioDevicesList();
				
			script.log("run aubio");
			
			// find sound card input audio
			var scInput = audioFindInput();
			if (scInput == "")
			{
				script.log("Input device not defined in Sound card module");
				util.showMessageBox("WLEDAudioSync ! ", "Input device not defined in Sound card module", "info", "Got it");
				local.parameters.beatParams.useBPM.set(0); 
				
			} else {
				
				script.log("Sound card input device : " + scInput);
				var aubioDevices = local.parameters.beatParams.inputAudio.getAllOptions();
				var	audioDeviceIndex = 0;

				
				for ( var i = 0; i < aubioDevices.length; i++)
				{
					if (scInput.contains(aubioDevices[i].key.substring(4,(aubioDevices[i].key.length)-1)))
					{
						script.log("Aubio device number : " + aubioDevices[i].value);
						break;
					}
				}
				
				if (aubioDevices[i].value != undefined)
				{
					audioDeviceIndex = aubioDevices[i].value;
				}
				
				if (aubioIsRunning === false)
				{
					options = 	" beat -s " + OSCIP + " " + root.modules.osc.parameters.oscInput.localPort.get() + ' "/WLEDAudioSync/beat/BPM"' + 
								" -d " + audioDeviceIndex +
								" -b " + local.parameters.beatParams.aubioBuffer.get();
					var command = homeDIR + moduleDIR + aubioCmdName + options;
					script.log("command to run : " + command);
					root.modules.os.launchCommand(command, true);
					
				} else {
					
					script.log("aubio is already running");
				}
			}
			
		} else {
			
			if (aubioIsRunning === true)
			{
				script.log("killing aubio : " + aubioProcessName);
				var killCmd = root.modules.os.commandTester.setCommand("OS","Process","Kill App");		
				killCmd.target.set(aubioProcessName);
				killCmd.hardKill.set(1);
				root.modules.os.commandTester.trigger.trigger();
				
			} else {
				
				script.log("nothing to kill");
			}

			local.parameters.beatParams.syncToBeat.set(0);			
		}

	} else if (param.name == "syncToBeat"){

		if (param.get() == 1){
			
			script.setUpdateRate(1);
			
		} else {
			
			script.setUpdateRate(50);
		}
		
	} else if (param.name == "forceReload"){

		var checkProcess = root.modules.os.getRunningProcesses("*");
		var aubioProcessName = "";
		
		addOSCScript("OSCBPM");
		
		for ( var i = 0; i < checkProcess.length; i ++)
		{
			if (checkProcess[i].contains(aubioProcName))
			{
				aubioProcessName = checkProcess[i];
				script.log("aubio is running");
				script.log("killing aubio : " + aubioProcessName);
				var killCmd = root.modules.os.commandTester.setCommand("OS","Process","Kill App");		
				killCmd.target.set(aubioProcessName);
				killCmd.hardKill.set(1);
				root.modules.os.commandTester.trigger.trigger();				
				break;
			}				
		}
		
		options = 	" beat -s " + OSCIP + " " + root.modules.osc.parameters.oscInput.localPort.get() + ' "/WLEDAudioSync/beat/BPM"' + 
					" -d " + local.parameters.beatParams.inputAudio.get() +
					" -b " + local.parameters.beatParams.aubioBuffer.get();
		var command = homeDIR + moduleDIR + aubioCmdName + options;
		script.log("command to run : " + command);		
		root.modules.os.launchCommand(command, true);	

	} else if (param.name == "live") {
		
		// find sound card input audio
		var scInput = audioFindInput();
		if (scInput == "")
		{
			script.log("Input device not defined in Sound card module");
			util.showMessageBox("WLEDAudioSync ! ", "Input device not defined in Sound card module", "info", "Got it");
			
		}
		
	} else if (param.name == "visualizeLiveAudio") {
		
		//execute Friture
		var exeCMD = homeDIR + moduleDIR + fritureCmdName;
		if (util.fileExists(exeCMD)){
			var launchresult = root.modules.os.launchProcess(exeCMD, false);
		} else {
			util.showMessageBox("Friture not found ", "file name : " + exeCMD , "warning", "Ok");			
		}		
		
	} else if (param.name == "useRTMGC") {
	
		if ( local.parameters.rtmgcParams.useRTMGC.get() == 1) 
		{
			var checkProcess = root.modules.os.getRunningProcesses("*");
			var rtmgcRun = false;
			
			for ( var i = 0; i < checkProcess.length; i ++)
			{
				if (checkProcess[i].contains(rtmgcProcName))
				{
					script.log("RTMGC is already running");
					var rtmgcRun = true;
					break;
					
				}
			}
			
			if (rtmgcRun === false) 
			{
				addOSCScript("OSCRTMGC");				
				var oscPort = OSCModule.parameters.oscInput.localPort.get();
				options = " " + local.parameters.rtmgcParams.serverPort.get() + " " + OSCIP + " " + oscPort;
			}
			
		} else {
			
			options = " kill ";
		}
		
		var command = homeDIR + moduleDIR + rtmgcCmdName + options;
		script.log("command to run : " + command);
		if (util.fileExists(homeDIR + moduleDIR + rtmgcCmdName)){
			root.modules.os.launchProcess(command, false);
		} else {
			script.log('Command file do not exist : ' + homeDIR + moduleDIR + rtmgcCmdName);
		}

		
	} else if (param.name == "useRTMMD") {
	
		if ( local.parameters.rtmmdParams.useRTMMD.get() == 1) 
		{			
			addOSCScript("OSCRTMMD");
			var showScreen = local.parameters.rtmmdParams.showScreen.get();
			if (showScreen){
				showScreen = 'Y';
			} else {
				showScreen = 'N';				
			}
			var verbose = local.parameters.rtmmdParams.verbose.get();
			if (verbose){
				verbose = 'Y';
			} else {
				verbose = 'N';				
			}			
			options = " " + showScreen + " " + verbose;

		} else {
			
			script.log('killing Emotion Color Map');
			options = " kill ";
		}
		var command = homeDIR + moduleDIR + rtmmdCmdName + options;
		script.log("command to run : " + command);
		if (util.fileExists(homeDIR + moduleDIR + rtmmdCmdName)){
			root.modules.os.launchCommand(command, true);
		} else {
			script.log('Command file do not exist : ' + homeDIR + moduleDIR + rtmmdCmdName);
		}
	}
}

// called each time a beat value changed 
function moduleValueChanged(param)
{
	if (param.name == "beat" && 
		local.parameters.beatParams.syncToBeat.get() == 1){
		
		if (local.parameters.beatParams.beatType.get() == 0 ){
			
			sendAudio(false);
					
		} else if (local.parameters.beatParams.beatType.get() == 1 &&
					param.get() == 1 ) {
						
			sendAudio(false);
			
		} else if (local.parameters.beatParams.beatType.get() == 2 && 
					param.get() == 0 ) {
						
			sendAudio(false);
		}
	}
}

// send audio data with optional delay
function sendAudio(replay)
{
	// new frame : packet values are recomputed once and shared by V1 / V2
	pktFrame += 1;
	// translate audio data to UDP message
	var udpdataV1 = udpAudioSyncV1(replay);
	
	if (replay)
	{
		duration -= 100;
	}
	
	// optional delay: audio datas during the delay are lost 
	var mydelay = local.parameters.delay.get();	
	if (replay === false && mydelay > 0)
	{
		util.delayThreadMS(mydelay);		
	}
	
	// v1 message
	if (local.parameters.audioV1.get() == 1)
	{
		local.sendBytesTo (multicastIP,uDPPort,udpdataV1);
	}
	// v2 message	
	if (local.parameters.audioV2.get() == 1)
	{
		var udpdataV2 = udpAudioSyncV2(udpdataV1);
		local.sendBytesTo (multicastIP,uDPPort,udpdataV2);		
	}
}

/* 
Sound Card
*/

// Create 16 FFT analysis entries with default name : adjustable size - custom
function createFFT(size)
{

	removeFFT();
	root.modules.soundCard.parameters.fftAnalysis.minDB.set(minDB);
	root.modules.soundCard.parameters.fftAnalysis.maxDB.set(maxDB);
	
	fftMode = "custom";

	if (size > 1)
	{
		size  = 1;
		
	} else if (size == 0) {
		
		size = 0.1;
	}

	for (var i = 0; i < 16; i += 1)
	{
		var bin = root.modules.soundCard.parameters.fftAnalysis.addItem();
		bin.position.set(0.0625 * i);
		bin.size.set(size);
		updateFreqTable(fftMode, i);
	}
}

// Create 16 FFT analysis entries with default name : WLED OLD/NEW -- true/false
function createWLEDFFT(old)
{

	removeFFT();
	root.modules.soundCard.parameters.fftAnalysis.minDB.set(minDB);
	root.modules.soundCard.parameters.fftAnalysis.maxDB.set(maxDB);	
	
	if (old)
	{
		fftMode = "old";
		
	} else {
		
		fftMode = "new";
	}
	

	for (var i = 0; i < 16; i += 1)
	{
		var bin = root.modules.soundCard.parameters.fftAnalysis.addItem();

		if (i == 0)
		{
			if (old) 
			{
				bin.position.set(0.020);
				bin.size.set(0.030);
				
			} else {
				
				bin.position.set(0.020);
				bin.size.set(0.020);				
			}
			
		} else if (i == 1) {
			
			if (old) 
			{
				bin.position.set(0.030);
				bin.size.set(0.030);
				
			} else {
				
				bin.position.set(0.030);
				bin.size.set(0.020);				
			}
			
		} else if (i == 2) {
			
			if (old) 
			{
				bin.position.set(0.040);
				bin.size.set(0.030);
				
			} else {
				
				bin.position.set(0.045);
				bin.size.set(0.020);				
			}
			
		} else if (i == 3) {
			
			if (old) 
			{
				bin.position.set(0.045);
				bin.size.set(0.030);
				
			} else {
				
				bin.position.set(0.065);
				bin.size.set(0.020);				
			}
			
		} else if (i == 4) {
			
			if (old) 
			{
				bin.position.set(0.060);
				bin.size.set(0.030);
				
			} else {
				
				bin.position.set(0.090);
				bin.size.set(0.020);				
			}
			
		} else if (i == 5) {
			
			if (old) 
			{
				bin.position.set(0.075);
				bin.size.set(0.030);
				
			} else {
				
				bin.position.set(0.110);
				bin.size.set(0.040);				
			}
			
		} else if (i == 6) {
			
			if (old) 
			{
				bin.position.set(0.090);
				bin.size.set(0.040);
				
			} else {
				
				bin.position.set(0.160);
				bin.size.set(0.040);				
			}
			
		} else if (i == 7) {
			
			if (old) 
			{
				bin.position.set(0.120);
				bin.size.set(0.040);
				
			} else {
				
				bin.position.set(0.215);
				bin.size.set(0.050);				
			}
			
		} else if (i == 8) {
			
			if (old) 
			{
				bin.position.set(0.150);
				bin.size.set(0.040);
				
			} else {
				
				bin.position.set(0.265);
				bin.size.set(0.050);				
			}
			
		} else if (i == 9) {
			
			if (old) 
			{
				bin.position.set(0.190);
				bin.size.set(0.040);
				
			} else {
				
				bin.position.set(0.340);
				bin.size.set(0.050);				
			}
			
		} else if (i == 10) {
			
			if (old) 
			{
				bin.position.set(0.245);
				bin.size.set(0.040);
				
			} else {
				
				bin.position.set(0.410);
				bin.size.set(0.050);				
			}
			
		} else if (i == 11) {
			
			if (old) 
			{
				bin.position.set(0.310);
				bin.size.set(0.040);
				
			} else {
				
				bin.position.set(0.490);
				bin.size.set(0.050);				
			}
			
		} else if (i == 12) {
			
			if (old) 
			{
				bin.position.set(0.390);
				bin.size.set(0.060);
				
			} else {
				
				bin.position.set(0.570);
				bin.size.set(0.060);				
			}
			
		} else if (i == 13) {
			
			if (old) 
			{
				bin.position.set(0.480);
				bin.size.set(0.060);
				
			} else {
				
				bin.position.set(0.645);
				bin.size.set(0.070);				
			}
			
		} else if (i == 14) {
			
			if (old) 
			{
				bin.position.set(0.590);
				bin.size.set(0.030);
				
			} else {
				
				bin.position.set(0.830);
				bin.size.set(0.070);				
			}
			
		} else if (i == 15) {
			
			if (old) 
			{
				bin.position.set(0.700);
				bin.size.set(0.050);
				
			} else {
				
				bin.position.set(0.915);
				bin.size.set(0.070);				
			}
		}
		
		updateFreqTable(fftMode, i);
	}
}

// update Frequences Table depend on FFT mode
function updateFreqTable(fftMode, index)
{
	
	if ( index == 0 ) 
	{
		if ( fftMode == "new" )
		{
			FREQTABLE[index] = 86;
			
		} else if ( fftMode == "old" ) {

			FREQTABLE[index] = 100;			
			
		} else if ( fftMode == "custom" ) {

			FREQTABLE[index] = 50;
		
		}
		
	} else if ( index == 1 ) {
		
		if ( fftMode == "new" )
		{
			FREQTABLE[index] = 129;
			
		} else if ( fftMode == "old" ) {

			FREQTABLE[index] = 120;			
			
		} else if ( fftMode == "custom" ) {

			FREQTABLE[index] = 280;
		
		}

	} else if ( index == 2 ) {
		
		if ( fftMode == "new" )
		{
			FREQTABLE[index] = 216;
			
		} else if ( fftMode == "old" ) {

			FREQTABLE[index] = 160;			
			
		} else if ( fftMode == "custom" ) {

			FREQTABLE[index] = 600;
		
		}

	} else if ( index == 3 ) {
		
		if ( fftMode == "new" )
		{
			FREQTABLE[index] = 301;
			
		} else if ( fftMode == "old" ) {

			FREQTABLE[index] = 200;			
			
		} else if ( fftMode == "custom" ) {

			FREQTABLE[index] = 950;
		
		}

	} else if ( index == 4 ) {
		
		if ( fftMode == "new" )
		{
			FREQTABLE[index] = 430;
			
		} else if ( fftMode == "old" ) {

			FREQTABLE[index] = 260;			
			
		} else if ( fftMode == "custom" ) {

			FREQTABLE[index] = 1300;
		
		}

	} else if ( index == 5 ) {
		
		if ( fftMode == "new" )
		{
			FREQTABLE[index] = 560;
			
		} else if ( fftMode == "old" ) {

			FREQTABLE[index] = 340;			
			
		} else if ( fftMode == "custom" ) {

			FREQTABLE[index] = 1700;
		
		}

	} else if ( index == 6 ) {
		
		if ( fftMode == "new" )
		{
			FREQTABLE[index] = 818;
			
		} else if ( fftMode == "old" ) {

			FREQTABLE[index] = 440;			
			
		} else if ( fftMode == "custom" ) {

			FREQTABLE[index] = 2150;
		
		}

	} else if ( index == 7 ) {
		
		if ( fftMode == "new" )
		{
			FREQTABLE[index] = 1120;
			
		} else if ( fftMode == "old" ) {

			FREQTABLE[index] = 600;			
			
		} else if ( fftMode == "custom" ) {

			FREQTABLE[index] = 2600;
		
		}

	} else if ( index == 8 ) {
		
		if ( fftMode == "new" )
		{
			FREQTABLE[index] = 1421;
			
		} else if ( fftMode == "old" ) {

			FREQTABLE[index] = 760;			
			
		} else if ( fftMode == "custom" ) {

			FREQTABLE[index] = 3100;
		
		}

	} else if ( index == 9 ) {
		
		if ( fftMode == "new" )
		{
			FREQTABLE[index] = 1895;
			
		} else if ( fftMode == "old" ) {

			FREQTABLE[index] = 980;			
			
		} else if ( fftMode == "custom" ) {

			FREQTABLE[index] = 3600;
		
		}

	} else if ( index == 10 ) {
		
		if ( fftMode == "new" )
		{
			FREQTABLE[index] = 2412;
			
		} else if ( fftMode == "old" ) {

			FREQTABLE[index] = 1300;			
			
		} else if ( fftMode == "custom" ) {

			FREQTABLE[index] = 4200;
		
		}

	} else if ( index == 11 ) {
		
		if ( fftMode == "new" )
		{
			FREQTABLE[index] = 3015;
			
		} else if ( fftMode == "old" ) {

			FREQTABLE[index] = 1700;			
			
		} else if ( fftMode == "custom" ) {

			FREQTABLE[index] = 4950;
		
		}

	} else if ( index == 12 ) {
		
		if ( fftMode == "new" )
		{
			FREQTABLE[index] = 3704;
			
		} else if ( fftMode == "old" ) {

			FREQTABLE[index] = 2240;			
			
		} else if ( fftMode == "custom" ) {

			FREQTABLE[index] = 5750;
		
		}

	} else if ( index == 13 ) {
		
		if ( fftMode == "new" )
		{
			FREQTABLE[index] = 4479;
			
		} else if ( fftMode == "old" ) {

			FREQTABLE[index] = 2960;			
			
		} else if ( fftMode == "custom" ) {

			FREQTABLE[index] = 6800;
		
		}

	} else if ( index == 14 ) {
		
		if ( fftMode == "new" )
		{
			FREQTABLE[index] = 7106;
			
		} else if ( fftMode == "old" ) {

			FREQTABLE[index] = 3900;			
			
		} else if ( fftMode == "custom" ) {

			FREQTABLE[index] = 8100;
		
		}

	} else if ( index == 15 ) {
		
		if ( fftMode == "new" )
		{
			FREQTABLE[index] = 9259;
			
		} else if ( fftMode == "old" ) {

			FREQTABLE[index] = 5120;			
			
		} else if ( fftMode == "custom" ) {

			FREQTABLE[index] = 10000;
		
		}
	}	
}


// remove all FFT analysis
function removeFFT()
{
	root.modules.soundCard.parameters.fftAnalysis.removeAll();
}

/*

WLED Specifics

*/

// This one should be always executed. If replay is true we had taken data from file.
function udpAudioSyncV1(replay)
{
/* 
#define UDP_SYNC_HEADER "00001"
struct audioSyncPacket {
  char header[6] = UDP_SYNC_HEADER;
  uint8_t myVals[32];     //  32 Bytes
  int sampleAgc;          //  04 Bytes
  int sampleRaw;          //  04 Bytes
  float sampleAvg;        //  04 Bytes
  bool samplePeak;        //  01 Bytes
  uint8_t fftResult[16];  //  16 Bytes - FFT results, one byte per GEQ channel
  double FFT_Magnitude;   //  08 Bytes
  double FFT_MajorPeak;   //  08 Bytes
};
----------------------------------------------------

  // update samples for effects
  volumeSmth   = fmaxf(receivedPacket->sampleAgc, 0.0f);
  volumeRaw    = volumeSmth;   // V1 format does not have "raw" AGC sample
  // update internal samples
  sampleRaw    = fmaxf(receivedPacket->sampleRaw, 0.0f);
  sampleAvg    = fmaxf(receivedPacket->sampleAvg, 0.0f);;
  sampleAgc    = volumeSmth;
  rawSampleAgc = volumeRaw;
  multAgc      = 1.0f;
  
-----------------------------------------------------

  bool newReading = MSGEQ7.read(MSGEQ7_INTERVAL);
  if (newReading) {
    audioSyncPacket transmitData;

    for (int b = 0; b < 14; b = b + 2) {
      int val = MSGEQ7.get((b / 2));
      val = mapNoise(val);
      Serial.printf("%u ", val);
      transmitData.fftResult[b] = val;
      transmitData.fftResult[(b + 1)] = val;  
    }

------------------------------------------------------

    int v = map(MSGEQ7.getVolume(), 0, MSGEQ7_OUT_MAX, 0, 1023); // TO DO: not sure this is right
    transmitData.sampleRaw = v; // Current sample

------------------------------------------------------


*/

	// save audio data to file
	if (snapshot)
	{
		script.log("Take snapshot");
		
		var soundFileName = homeDIR + moduleDIR + "Snapshot_" + util.getTimestamp() + ".csv";
		var data = wledVol + ";" + wledPeak + ";" + wledMag + ";" + wledFreq;
		for (var i = 0; i < 16; i+=1)
		{
			data = data + ";" + FFTWLED[i];
		}
		data = data + ";" + fftMode;
		
		// write sound data to file		
		util.writeFile(soundFileName, data, false);		
		util.showMessageBox("Snapshot", "file name : " + soundFileName , "info", "Ok");
		
		snapshot = false;
	}

	
	// FFT Max Freq / Magnitude
	fftSoundMaxFreqMagnitude = 0;
	fftSoundMaxFreqIndex = 0;

	if (replay === false  && local.parameters.live.get() == 1)	
	{
	
		// sampleRaw 4 Bytes
		wledVol = root.modules.soundCard.values.volume.get()*volMultiplier;
		
		// Calculate FFT Data
		// Freq value
		FFTWLED[0] = root.modules.soundCard.values.fftEnveloppes.analyzer1Value.get()*fftMultiplier;
		FFTWLED[1] = root.modules.soundCard.values.fftEnveloppes.analyzer2Value.get()*fftMultiplier;
		FFTWLED[2] = root.modules.soundCard.values.fftEnveloppes.analyzer3Value.get()*fftMultiplier;	
		FFTWLED[3] = root.modules.soundCard.values.fftEnveloppes.analyzer4Value.get()*fftMultiplier;
		FFTWLED[4] = root.modules.soundCard.values.fftEnveloppes.analyzer5Value.get()*fftMultiplier;
		FFTWLED[5] = root.modules.soundCard.values.fftEnveloppes.analyzer6Value.get()*fftMultiplier;	
		FFTWLED[6] = root.modules.soundCard.values.fftEnveloppes.analyzer7Value.get()*fftMultiplier;	
		FFTWLED[7] = root.modules.soundCard.values.fftEnveloppes.analyzer8Value.get()*fftMultiplier;
		FFTWLED[8] = root.modules.soundCard.values.fftEnveloppes.analyzer9Value.get()*fftMultiplier;
		FFTWLED[9] = root.modules.soundCard.values.fftEnveloppes.analyzer10Value.get()*fftMultiplier;	
		FFTWLED[10] = root.modules.soundCard.values.fftEnveloppes.analyzer11Value.get()*fftMultiplier;	
		FFTWLED[11] = root.modules.soundCard.values.fftEnveloppes.analyzer12Value.get()*fftMultiplier;
		FFTWLED[12] = root.modules.soundCard.values.fftEnveloppes.analyzer13Value.get()*fftMultiplier;
		FFTWLED[13] = root.modules.soundCard.values.fftEnveloppes.analyzer14Value.get()*fftMultiplier;	
		FFTWLED[14] = root.modules.soundCard.values.fftEnveloppes.analyzer15Value.get()*fftMultiplier;	
		FFTWLED[15] = root.modules.soundCard.values.fftEnveloppes.analyzer16Value.get()*fftMultiplier;
		

		// retreive MaxFreq and Magnitude
		for (var i = 0; i < 16; i +=1)
		{
			if (fftSoundMaxFreqMagnitude < FFTWLED[i])
			{
				fftSoundMaxFreqMagnitude = FFTWLED[i];				
				fftSoundMaxFreqIndex = FREQTABLE[i];
			}
		}
		
		// FFT Magnitude 8 bytes
		wledMag = fftSoundMaxFreqMagnitude;
		// FFT Max Freq 8 bytes
		wledFreq = fftSoundMaxFreqIndex;

		// samplePeak (0/1, or pitch value in legacy mode)
		wledPeak = detectPeak();

	} else if (replay === false  && local.parameters.live.get() == 0) {
		
		// set audio data
		wledVol = 0;
		wledPeak = 0;
		wledMag = 0;
		wledFreq = 0;
		
		for ( var i = 0; i < 16; i += 1)
		{
			FFTWLED[i] = 0;
		}
		
	}
	
	//
	// create UDP data (values normalised to the ranges WLED 0.15 expects)
	//
	var pkt = wledPacketValues();

	var fftMagArray = createIntArray(util.doubleToHexSeq(pkt.mag,true));
	var fftFreqArray = createIntArray(util.doubleToHexSeq(pkt.freq,true));
	var avgArray = createIntArray(util.floatToHexSeq(pkt.smth,true));
	var agcArray = int32ToBytesLE(pkt.smth);
	var rawArray = int32ToBytesLE(pkt.raw);
	var volByte = clampValue(Math.round(pkt.raw), 0, 255);

	// Header v1 "00001"
	UDP_AUDIO_SYNC[0] = 48;
	UDP_AUDIO_SYNC[1] = 48;
	UDP_AUDIO_SYNC[2] = 48;
	UDP_AUDIO_SYNC[3] = 48;
	UDP_AUDIO_SYNC[4] = 49;
	UDP_AUDIO_SYNC[5] = 0;
	// uint8_t myVals[32];
	// Used to store a pile of samples because WLED frame rate and WLED sample rate are not synchronized.
	for (var i = 6; i < 38; i += 1)
	{
		UDP_AUDIO_SYNC[i] = volByte;
	}
	// Filler
	UDP_AUDIO_SYNC[38] = 0;
	UDP_AUDIO_SYNC[39] = 0;
	// int sampleAgc;          //  04 Bytes  (int32, little endian) -> volumeSmth on receiver
	// int sampleRaw;          //  04 Bytes  (int32, little endian)
	for (var i = 0; i < 4; i += 1)
	{
		UDP_AUDIO_SYNC[40 + i] = agcArray[i];
		UDP_AUDIO_SYNC[44 + i] = rawArray[i];
	}
	// float sampleAvg;        //  04 Bytes
	UDP_AUDIO_SYNC[48] = avgArray[3];
	UDP_AUDIO_SYNC[49] = avgArray[2];
	UDP_AUDIO_SYNC[50] = avgArray[1];
	UDP_AUDIO_SYNC[51] = avgArray[0];
	// bool samplePeak;        //  01 Bytes
	UDP_AUDIO_SYNC[52] = pkt.peak;
	// uint8_t fftResult[16];  //  16 Bytes - one byte per GEQ channel, 0..254
	for (var i = 0; i < 16; i += 1)
	{
		UDP_AUDIO_SYNC[53 + i] = pkt.fft[i];
	}
	// Filler
	UDP_AUDIO_SYNC[69] = 0;
	UDP_AUDIO_SYNC[70] = 0;
	UDP_AUDIO_SYNC[71] = 0;
	// double FFT_Magnitude;   //  08 Bytes
	// double FFT_MajorPeak;   //  08 Bytes
	for (var i = 0; i < 8; i += 1)
	{
		UDP_AUDIO_SYNC[72 + i] = fftMagArray[7 - i];
		UDP_AUDIO_SYNC[80 + i] = fftFreqArray[7 - i];
	}

return UDP_AUDIO_SYNC;
}

// v2 message , new format
function udpAudioSyncV2(udpdataV1)
{
/*
  // "V2" audiosync struct - 44 bytes - WLED 0.14 / 0.15 / main (usermods/audioreactive)

  struct __attribute__ ((packed)) audioSyncPacket {
  char    header[6];      //  06 Bytes  offset 0   "00002"
  uint8_t reserved1[2];   //  02 Bytes  offset 6
  float   sampleRaw;      //  04 Bytes  offset 8   -> volumeRaw   (0..255)
  float   sampleSmth;     //  04 Bytes  offset 12  -> volumeSmth  (0..255)
  uint8_t samplePeak;     //  01 Bytes  offset 16  0 no peak; >=1 peak detected
  uint8_t reserved2;      //  01 Bytes  offset 17
  uint8_t fftResult[16];  //  16 Bytes  offset 18  (0..254)
  uint16_t reserved3;     //  02 Bytes  offset 34
  float  FFT_Magnitude;   //  04 Bytes  offset 36
  float  FFT_MajorPeak;   //  04 Bytes  offset 40  (receiver constrains to 1..11025 Hz)
  };

  The receiver only accepts the packet if its size is exactly 44 bytes.
*/

	var pkt = wledPacketValues();

	var rawArray = createIntArray(util.floatToHexSeq(pkt.raw,true));
	var smthArray = createIntArray(util.floatToHexSeq(pkt.smth,true));
	var fftMagArray = createIntArray(util.floatToHexSeq(pkt.mag,true));
	var fftFreqArray = createIntArray(util.floatToHexSeq(pkt.freq,true));

	// Header "00002"
	UDP_AUDIO_SYNC_V2[0] = 48;
	UDP_AUDIO_SYNC_V2[1] = 48;
	UDP_AUDIO_SYNC_V2[2] = 48;
	UDP_AUDIO_SYNC_V2[3] = 48;
	UDP_AUDIO_SYNC_V2[4] = 50;
	UDP_AUDIO_SYNC_V2[5] = 0;
	// reserved1
	UDP_AUDIO_SYNC_V2[6] = 0;
	UDP_AUDIO_SYNC_V2[7] = 0;
	for (var i = 0; i < 4; i += 1)
	{
		// sampleRaw / sampleSmth / FFT_Magnitude / FFT_MajorPeak (float, little endian)
		UDP_AUDIO_SYNC_V2[8 + i] = rawArray[3 - i];
		UDP_AUDIO_SYNC_V2[12 + i] = smthArray[3 - i];
		UDP_AUDIO_SYNC_V2[36 + i] = fftMagArray[3 - i];
		UDP_AUDIO_SYNC_V2[40 + i] = fftFreqArray[3 - i];
	}
	// samplePeak
	UDP_AUDIO_SYNC_V2[16] = pkt.peak;
	// reserved2
	UDP_AUDIO_SYNC_V2[17] = 0;
	// fftResult
	for (var i = 0; i < 16; i += 1)
	{
		UDP_AUDIO_SYNC_V2[18 + i] = pkt.fft[i];
	}
	// reserved3
	UDP_AUDIO_SYNC_V2[34] = 0;
	UDP_AUDIO_SYNC_V2[35] = 0;

return UDP_AUDIO_SYNC_V2;
}

/*

WLED 0.15 helpers

*/

// Values for both packet versions, clamped to the ranges WLED 0.15 uses internally.
// Computed once per frame (cached), so V1 and V2 send identical data and smoothing advances once.
var pktCache = null;
var pktCacheFrame = -1;
var pktFrame = 0;

function wledPacketValues()
{
	if (pktCache !== null && pktCacheFrame == pktFrame)
	{
		return pktCache;
	}

	var raw = clampValue(wledVol, 0, 255);
	// same smoothing as WLED getSample() : sampleAvg = ((sampleAvg * 15) + sampleAdj) / 16
	wledSmth = ((wledSmth * 15.0) + raw) / 16.0;
	if (wledSmth < 0.01) { wledSmth = 0; }

	var fft = [];
	for (var i = 0; i < 16; i += 1)
	{
		fft[i] = clampValue(Math.round(FFTWLED[i]), 0, 254);
	}

	var peak = 0;
	if (wledPeak != 0) { peak = 1; }

	var freq = clampValue(wledFreq, 1, 11025);
	var mag = clampValue(wledMag, 0, 1000000);

	pktCache = { "raw": raw, "smth": wledSmth, "peak": peak, "fft": fft, "mag": mag, "freq": freq };
	pktCacheFrame = pktFrame;
	return pktCache;
}

// samplePeak source, selected by the "Peak Source" parameter
//  0 = Bass onset : bass bands jump above their running average (like WLED's own detector, min 100 ms apart)
//  1 = Beat (aubio) : one peak per beat received via OSC (needs "Use BPM"), falls back to bass onset otherwise
//  2 = Pitch (legacy) : any detected pitch is a peak (behaviour of module <= 2.1.1)
function detectPeak()
{
	var source = local.parameters.peakSource.get();

	if (source == 2)
	{
		return root.modules.soundCard.values.pitchDetection.pitch.get();
	}

	if (source == 1 && local.parameters.beatParams.useBPM.get() == 1)
	{
		var beat = local.values.beat.get();
		if (beat != lastBeatValue)
		{
			lastBeatValue = beat;
			return 1;
		}
		return 0;
	}

	// bass onset
	var bass = Math.max(clampValue(FFTWLED[0], 0, 255), clampValue(FFTWLED[1], 0, 255));
	var now = util.getTime();
	var peak = 0;
	if (bass > 32 &&
		bass > bassAvg * local.parameters.peakSensitivity.get() &&
		(now - lastPeakTime) > 0.1)
	{
		peak = 1;
		lastPeakTime = now;
	}
	bassAvg = (bassAvg * 0.9) + (bass * 0.1);
	return peak;
}

function clampValue(value, min, max)
{
	return Math.min(Math.max(value, min), max);
}

// int32 little endian byte array (for V1 "int" fields)
function int32ToBytesLE(value)
{
	var v = Math.round(value);
	if (v < 0) { v = 0; }
	return [v % 256, Math.floor(v / 256) % 256, Math.floor(v / 65536) % 256, Math.floor(v / 16777216) % 256];
}

/*

OSC Module

*/

function addOSCScript(scriptName)
{
	OSCModule = root.modules.getItemWithName("OSC");
	// create module if not exist
	if (OSCModule.name == "undefined" ) 
	{
		script.log("Create OSC");
		OSCModule = root.modules.addItem("OSC");
	}

	var localTest = '';	
	if (scriptName == "OSCBPM")
	{		
		localTest = local.parameters.getChild("Beat Params");		
		
	} else if (scriptName == "OSCRTMGC") {
		
		localTest = local.parameters.getChild("RTMGC Params");

	} else if (scriptName == "OSCRTMMD") {
		
		localTest = local.parameters.getChild("RTMMD Params");
		
	} else {
		
		script.log('unknown script');
		return;
	}
	

	var testScript = OSCModule.scripts.getChild(scriptName);	
	if (testScript.name == "undefined")
	{
		var mysc = OSCModule.scripts.addItem();

		if (localTest.scriptFile.get() == scriptName + ".js")
		{
			mysc.filePath.set(homeDIR + moduleDIR + scriptName+".js");
			
		} else {
			
			mysc.filePath.set(localTest.scriptFile.get());
		}
	}

}


/*
 
 Utilities

*/

// Convert Sequence of Hex Char values ( from 00 to FF ) to int Array
function createIntArray(hexSequence)
{
	var intArray = [];
	var j = 0;
	
    for ( var i = 0; i < hexSequence.length; i+=2 )
	{
		intArray[j] = util.hexStringToInt(hexSequence.substring(i,i+1) + hexSequence.substring(i+1,i+2));
		j +=1;
    }
	
return intArray;
}

// Will bind to UDP port on specified IP address and join the MulticastGroup
// On 10/03/2023: Multicast do not work as expected on Chataigne, mainly when more than one network card
function testMultiCast()
{
	myIP = local.parameters.ipAddressToBind.getKey();
	script.log(myIP , multicastIP , uDPPort);
	
	var multiExeCmd = homeDIR + moduleDIR + multicastCmdName;
	if (util.fileExists(multiExeCmd))
	{
		script.log("multicastCmdName Ok");
		var multiOptions = " --ip " + myIP + " --group " + multicastIP + " --port " + uDPPort;
		var exeCMD = multiExeCmd + multiOptions;
		script.log('command to run : '+ exeCMD);
		// we execute the cmd 
		var launchresult = root.modules.os.launchProcess(exeCMD, false);
		
	} else {
		
		script.log('multicmd not found');
	}
}

// replay audio data from snapshot file
function runReplay(fileName, myduration)
{
	duration = myduration;
	
	// if same file for replay, avoid to read it again and again
	if (fileName != previousFile)
	{
		script.log("File Name : "  + fileName);
		if (fileName == ""){return;}
		SOUNDDATA = [];
		SOUNDDATA = util.readFile(fileName).split(";");
		previousFile = fileName;
	}

	// set audio datas
	wledVol  = SOUNDDATA[0];
	wledPeak = SOUNDDATA[1];
	wledMag  = SOUNDDATA[2];
	wledFreq = SOUNDDATA[3];
	
	for ( var i = 0; i < 16; i += 1 )
	{
		FFTWLED[i] = SOUNDDATA[4+i];
	}

	replay = true;
	script.setUpdateRate(10);
}

// Find Audio input device name 
function audioFindInput()
{
	var audioInput = "";

	var JSONobj = root.modules.soundCard.getJSONData();
	var JSONdata = JSON.stringify(JSONobj.audioSettings);
	var audioSettings = JSONdata.split("=");
	
	for ( var i = 0; i < audioSettings.length ; i++) 
	{		
		if (audioSettings[i].contains("audioInputDeviceName"))
		{
			audioInput = audioSettings[i+1].split('"')[1];
			break;
		}		
	}
	
	audioInput = audioInput.substring(0,audioInput.length-1);
	
return audioInput;	
}

// retreive temp location
function findTMP ()
{
	script.log("Retreive temp folder");
	// TMP, TMPDIR, and TEMP environment variables 
	var pathTMP = util.getEnvironmentVariable("TMP");
	var pathTMPDIR = util.getEnvironmentVariable("TMPDIR");	
	var pathTEMP = util.getEnvironmentVariable("TEMP");
	
	if (pathTMP != "")
	{
		tempDIR = pathTMP;
		return tempDIR;
		
	} else if (pathTMPDIR != ""){
		tempDIR = pathTMPDIR;
		return tempDIR;

	} else if (pathTEMP != ""){
		tempDIR = pathTEMP;
		return tempDIR;	
	}
	
	script.log('ERROR temp directory not found');
	
return tempDIR;
}

// retreive devices list from aubio
function aubioDevicesList()
{
	var fileTmp = findTMP() + "/aubioDevicesList.tmp";
	var command = homeDIR + moduleDIR + aubioCmdName + " list >" + fileTmp;
	var result = root.modules.os.launchCommand(command, false);
	var devicesList = util.readFile(fileTmp).split("\n");
	
	local.parameters.beatParams.inputAudio.removeOptions();
	
	for ( var i = 0; i < devicesList.length ; i ++)
	{
		if (devicesList[i].startsWith("["))
		{
			local.parameters.beatParams.inputAudio.addOption(devicesList[i].replace("\n","").replace("\r",""),devicesList[i].substring(1,2));
		}
	}
}

// Deactivate FFT

// bass
function bassFFT(onOff)
{
	if (onOff)
	{
		root.modules.soundCard.parameters.fftAnalysis.analyzer1.enabled.set(1);
		root.modules.soundCard.parameters.fftAnalysis.analyzer2.enabled.set(1);
		root.modules.soundCard.parameters.fftAnalysis.analyzer3.enabled.set(1);
		root.modules.soundCard.parameters.fftAnalysis.analyzer4.enabled.set(1);		
		
	} else {
		root.modules.soundCard.parameters.fftAnalysis.analyzer1.enabled.set(0);
		root.modules.soundCard.parameters.fftAnalysis.analyzer2.enabled.set(0);
		root.modules.soundCard.parameters.fftAnalysis.analyzer3.enabled.set(0);
		root.modules.soundCard.parameters.fftAnalysis.analyzer4.enabled.set(0);		
	}
}
// midrange
function midFFT(onOff)
{
	if (onOff)
	{
		root.modules.soundCard.parameters.fftAnalysis.analyzer5.enabled.set(1);
		root.modules.soundCard.parameters.fftAnalysis.analyzer6.enabled.set(1);
		root.modules.soundCard.parameters.fftAnalysis.analyzer7.enabled.set(1);
		root.modules.soundCard.parameters.fftAnalysis.analyzer8.enabled.set(1);
		root.modules.soundCard.parameters.fftAnalysis.analyzer9.enabled.set(1);
		root.modules.soundCard.parameters.fftAnalysis.analyzer10.enabled.set(1);
		root.modules.soundCard.parameters.fftAnalysis.analyzer11.enabled.set(1);		
		
	} else {
		root.modules.soundCard.parameters.fftAnalysis.analyzer5.enabled.set(0);
		root.modules.soundCard.parameters.fftAnalysis.analyzer6.enabled.set(0);
		root.modules.soundCard.parameters.fftAnalysis.analyzer7.enabled.set(0);
		root.modules.soundCard.parameters.fftAnalysis.analyzer8.enabled.set(0);
		root.modules.soundCard.parameters.fftAnalysis.analyzer9.enabled.set(0);
		root.modules.soundCard.parameters.fftAnalysis.analyzer10.enabled.set(0);
		root.modules.soundCard.parameters.fftAnalysis.analyzer11.enabled.set(0);		
	}
}
// high
function highFFT(onOff)
{
	if (onOff)
	{
		root.modules.soundCard.parameters.fftAnalysis.analyzer12.enabled.set(1);
		root.modules.soundCard.parameters.fftAnalysis.analyzer13.enabled.set(1);
		root.modules.soundCard.parameters.fftAnalysis.analyzer14.enabled.set(1);
		root.modules.soundCard.parameters.fftAnalysis.analyzer15.enabled.set(1);
		root.modules.soundCard.parameters.fftAnalysis.analyzer16.enabled.set(1);		
		
	} else {
		root.modules.soundCard.parameters.fftAnalysis.analyzer12.enabled.set(0);
		root.modules.soundCard.parameters.fftAnalysis.analyzer13.enabled.set(0);
		root.modules.soundCard.parameters.fftAnalysis.analyzer14.enabled.set(0);
		root.modules.soundCard.parameters.fftAnalysis.analyzer15.enabled.set(0);
		root.modules.soundCard.parameters.fftAnalysis.analyzer16.enabled.set(0);
	}
}
// reset volume & magnitude multiplier
function resetVolMag()
{
	local.parameters.volumeMultiplier.set(512);
	local.parameters.frequencyMagnitudeMultiplier.set(254);
}

// true if module exist
function checkModuleExist (moduleName)
{
	var moduleExist = root.modules.getItemWithName(moduleName);
	var result = false;
	if (moduleExist.name != "undefined")
	{
		result = true;
	}
	return result;
}

// just for some test
function test()
{

}