//our username 
var name; 
var connectedUser; 

//connecting to our signaling server 
var conn = new WebSocket('wss://172.31.8.81:9090', null, {
	rejectUnauthorized: false
}); 

conn.onopen = function () { 
   console.log("Connected to the signaling server");
};
 
//when we got a message from a signaling server 
conn.onmessage = function (msg) { 
   console.log("Got message", msg.data); 
   var data = JSON.parse(msg.data);
	
   switch(data.type) { 
		case "login": 
			handleLogin(data.success); 
			break; 
		//when somebody wants to call us 
		case "offer": 
			handleOffer(data.offer, data.name); 
			break; 
		case "answer": 
			handleAnswer(data.answer); 
			break; 
		//when a remote peer sends an ice candidate to us 
		case "candidate": 
			handleCandidate(data.candidate); 
			break; 
		case "leave": 
			handleLeave();
			break; 
		default: 
			break; 
   } 
}; 

conn.onerror = function (err) { 
	console.log("Got error", err); 
}; 

//alias for sending JSON encoded messages 
function send(message) { 
   //attach the other peer username to our messages
	if (connectedUser) { 
		message.name = connectedUser; 
	}
	conn.send(JSON.stringify(message)); 
};
 
//****** 
//UI selectors block 
//****** 

var loginPage = document.querySelector('#loginPage'); 
var usernameInput = document.querySelector('#usernameInput'); 
var loginBtn = document.querySelector('#loginBtn'); 

var callPage = document.querySelector('#callPage'); 
var callToUsernameInput = document.querySelector('#callToUsernameInput');
var callBtn = document.querySelector('#callBtn'); 

var localVideo = document.querySelector('#localVideo'); 
var remoteVideo = document.querySelector('#remoteVideo');
let inboundStream = null;

var hangUpBtn = document.querySelector('#hangUpBtn'); 
var msgInput = document.querySelector('#msgInput'); 
var sendMsgBtn = document.querySelector('#sendMsgBtn'); 

var chatArea = document.querySelector('#chatarea'); 
var yourConn; 
var dataChannel; 
var stream;
callPage.style.display = "none"; 

// Login when the user clicks the button 
loginBtn.addEventListener("click", function (event) { 
   name = usernameInput.value; 
	
   if (name.length > 0) { 
		send({ 
			type: "login", 
			name: name 
		}); 
   } 
	
});
 
function handleLogin(success) { 

   if (success === false) {
		alert("Ooops...try a different username"); 
   } else { 
		loginPage.style.display = "none"; 
		callPage.style.display = "block"; 
		chatArea.innerHTML += "<strong>Logged in as " + name + ".</strong><br />";
		
		//********************** 
		//Starting a peer connection 
		//********************** 
		//using Google public stun server 
		var configuration = { 
			"iceServers": [{ "urls": "stun:stun2.1.google.com:19302" }] 
		}; 
		yourConn = new RTCPeerConnection(configuration, {optional: [{RtpDataChannels: true}]}); 
		openVideo();
		// Setup ice handling 
		yourConn.onicecandidate = function (event) { 
			if (event.candidate) { 
				send({ 
					type: "candidate", 
					candidate: event.candidate 
				}); 
			} 
		};
		
		yourConn.ontrack = ev => {
			console.log('track event muted = ' + ev.track.muted);
			ev.track.onunmute = () => {
				if (ev.streams && ev.streams[0]) {
					remoteVideo.srcObject = ev.streams[0];
					localVideo.srcObject = stream;
				} else {
					if (!inboundStream) {
						inboundStream = new MediaStream();
						remoteVideo.srcObject = inboundStream;
						localVideo.srcObject = stream;
					}
				inboundStream.addTrack(ev.track);
				}
			}
			
		}
	  
		yourConn.onconnectionstatechange = function(event) {
			switch(yourConn.connectionState) {
				case "connected":
					// The connection has become fully connected
					callToUsernameInput.style.display = "none";
					callBtn.style.display = "none";
					hangUpBtn.style.display = "initial";
					chatArea.innerHTML += "<strong>Connected with " + connectedUser + ".</strong><br />";
					break;
				case "disconnected":
					callToUsernameInput.style.display = "initial";
					callBtn.style.display = "initial";
					hangUpBtn.style.display = "none";
					chatArea.innerHTML += "<strong>Disconnected.</strong><br />";
					break;
				case "failed":
					// One or more transports has terminated unexpectedly or in an error
					chatArea.innerHTML += "<strong>Connection failed.</strong><br />";
					callToUsernameInput.style.display = "initial";
					callBtn.style.display = "initial";
					hangUpBtn.style.display = "none";
					break;
				default:
					break;
			}
		}
		
		//creating data channel 
		dataChannel = yourConn.createDataChannel("channel1", {reliable:true}); 
		
		dataChannel.onerror = function (error) {
			console.log("Ooops...error:", error); 
		}; 
		
		//when we receive a message from the other peer, display it on the screen 
		dataChannel.onmessage = function (event) {
			var today = new Date();
			var time = today.getHours() + ":" + today.getMinutes();
			chatArea.innerHTML += "<b>[" + time + "] " + connectedUser + ":</b> " + event.data + "<br />"; 
		}; 
		
		dataChannel.onclose = function () {
			chatArea.innerHTML += "<strong>Connection closed.</strong><br />";
			callToUsernameInput.style.display = "initial";
			callBtn.style.display = "initial";
			console.log("data channel is closed");
		};
	}
};
 
//initiating a call 
callBtn.addEventListener("click", function () { 
	var callToUsername = callToUsernameInput.value; 
	if (callToUsername.length > 0) { 
		connectedUser = callToUsername; 
		// create an offer 
		yourConn.createOffer(function (offer) { 
			send({ 
				type: "offer", 
				offer: offer 
			}); 
			yourConn.setLocalDescription(offer); 
		}, function (error) { 
			alert("Error when creating an offer"); 
		}); 
	} 	
});
 
//when somebody sends us an offer 
function handleOffer(offer, name) { 
	connectedUser = name; 
	yourConn.setRemoteDescription(new RTCSessionDescription(offer)); 
	
	//create an answer to an offer 
	yourConn.createAnswer(function (answer) { 
		yourConn.setLocalDescription(answer); 
		send({ 
			type: "answer", 
			answer: answer 
		}); 
	}, function (error) { 
		alert("Error when creating an answer"); 
	});
};
 
//when we got an answer from a remote user 
function handleAnswer(answer) { 
	yourConn.setRemoteDescription(new RTCSessionDescription(answer)); 
};
 
//when we got an ice candidate from a remote user 
function handleCandidate(candidate) { 
	yourConn.addIceCandidate(new RTCIceCandidate(candidate)); 
};
 
//hang up 
hangUpBtn.addEventListener("click", function () { 
	send({ 
		type: "leave" 
	}); 
	
	handleLeave(); 
}); 

function handleLeave() { 
	connectedUser = null;
	remoteVideo.srcObject = null;
	localVideo.srcObject = null;
	
	stream.getTracks().forEach( function(track) {
		track.stop();
	});
   
	yourConn.close(); 
	yourConn.onicecandidate = null; 
	yourConn.ontrack = null; 
};
 
//when user clicks the "send message" button 
sendMsgBtn.addEventListener("click", function (event) { 
   var val = msgInput.value; 
   var today = new Date();
   var time = today.getHours() + ":" + today.getMinutes();
   
   chatArea.innerHTML += "<b>[" + time + "] " + name + ":</b> " + val + "<br />"; 
	
   //sending a message to a connected peer 
   dataChannel.send(val); 
   msgInput.value = ""; 
});


async function openVideo() {
	const constraints = {
		audio: {
			echoCancellation : true,
			echoCancellationType : 'system',
			noiseSuppression : false
		},
		video: { width: 320, height: 180 }
	};
	console.log('Using media constraints:', constraints);
	try {
		stream = await navigator.mediaDevices.getUserMedia(constraints);
		for (const track of stream.getTracks()) {
			yourConn.addTrack(track);
		}
	} catch (e) {
		console.error('navigator.getUserMedia error:', e);
		errorMsgElement.innerHTML = `navigator.getUserMedia error:${e.toString()}`;
	}
}