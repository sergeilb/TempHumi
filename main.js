// Get references to UI elements
let connectButton = document.getElementById('connect');
let disconnectButton = document.getElementById('disconnect');
let terminalContainer = document.getElementById('terminal');
let tempContainer = document.getElementById('temp');
let humiContainer = document.getElementById('humi');

// Connect to the device on Connect button click
connectButton.addEventListener('click', function() {
  connect();
});

// Disconnect from the device on Disconnect button click
disconnectButton.addEventListener('click', function() {
  disconnect();
});

// Handle form submit event
//sendForm.addEventListener('submit', function(event) {
//  event.preventDefault(); // Prevent form sending
//  send(inputField.value); // Send text field contents
//  inputField.value = '';  // Zero text field
//  inputField.focus();     // Focus on text field
//});

// Selected device object cache
let deviceCache = null;
let serviceCache = null;
let tempCharCache = null;
let humiCharCache = null;


function requestBluetoothDevice() {
	log('Requesting bluetooth device...');
	return navigator.bluetooth.requestDevice({
		filters: [{name: "SergeiTH"}],}).
      then(device => {
			log('"' + device.name + '" bluetooth device selected');
			deviceCache = device;
			deviceCache.addEventListener('gattserverdisconnected', handleDisconnection);
			connectButton.disabled = true;
			disconnectButton.disabled = false;
			return deviceCache;
      });
}

function connect() {
	return (deviceCache ? Promise.resolve(deviceCache) :
		requestBluetoothDevice()).
      then(device => connectDeviceAndCacheService(device)).
		then(service => {let tempChar = service.getCharacteristic(0x2A6E);
							  let humiChar = service.getCharacteristic(0x2A6F);
							  return Promise.all([tempChar, humiChar])}).
		then(([tempChar, humiChar]) => {
			tempCharCache = tempChar;
			humiCharCache = humiChar;
			startTempNotifications();											
			startHumiNotifications()}).
      catch(error => log(error));
}

// Connect to the device specified and get service
function connectDeviceAndCacheService(device) {
	if (device.gatt.connected && serviceCache) {
		return Promise.resolve(serviceCache);
	}
	log('Connecting to GATT server...');
	return device.gatt.connect().
      then(server => {
        log('GATT server connected, getting service...');
        return server.getPrimaryService(0x181A);
      }).
		then(service => {
        log('Service found');
        serviceCache = service;
        return serviceCache;
      });
}

// Disconnect from the connected device
function disconnect() {
	if (deviceCache) {
		log('Disconnecting from "' + deviceCache.name + '" bluetooth device...');
		deviceCache.removeEventListener('gattserverdisconnected', handleDisconnection);

		if (deviceCache.gatt.connected) {
			deviceCache.gatt.disconnect();
			log('"' + deviceCache.name + '" bluetooth device disconnected');
		}
		else {
			log('"' + deviceCache.name + '" bluetooth device is already disconnected');
		}
	}
	if (tempCharCache) {
		tempCharCache.removeEventListener('characteristicvaluechanged', handleTempValueChanged);
		tempCharCache = null;
	}	
	if (humiCharCache) {
		humiCharCache.removeEventListener('characteristicvaluechanged', handleHumiValueChanged);
		humiCharCache = null;
	}		
	deviceCache = null;
	connectButton.disabled = false;
	disconnectButton.disabled = true;
}

function handleDisconnection(event) {
	let device = event.target;
	log('"' + device.name + '" bluetooth device disconnected, trying to reconnect...');
	connectDeviceAndCacheService(device).
	then(service => {let tempChar = service.getCharacteristic(0x2A6E);
						  let humiChar = service.getCharacteristic(0x2A6F);
						  return Promise.all([tempChar, humiChar])}).
	then(([tempChar, humiChar]) => {
			tempCharCache = tempChar;
			humiCharCache = humiChar;
			startTempNotifications();											
			startHumiNotifications()}).
	catch(error => log(error));	
}

// Enable temp characteristic changes notification
function startTempNotifications() {
	log('Starting temp notifications...');
	return tempCharCache.startNotifications().
      then(() => {
        log('Temp notifications started');
		  tempCharCache.addEventListener('characteristicvaluechanged', handleTempValueChanged);
      });
}

// Enable humi characteristic changes notification
function startHumiNotifications() {
	log('Starting humi notifications...');
	return humiCharCache.startNotifications().
      then(() => {
        log('Humi notifications started');
		  humiCharCache.addEventListener('characteristicvaluechanged', handleHumiValueChanged);
      });
}

// Temp data receiving
function handleTempValueChanged(event) {
	let value = event.target.value.getInt16(0, true);
//	log("temp = " + value);
	tempContainer.innerHTML = value/100;
}
// Humi data receiving
function handleHumiValueChanged(event) {
	let value = event.target.value.getUint16(0, true);
//	log("humi = " + value);
	humiContainer.innerHTML = value/100;
}

// Output to terminal
function log(data) {	
//	terminalContainer.insertAdjacentHTML('beforeend',
	terminalContainer.innerHTML = 
      '<div>' + data + '</div>';
}

