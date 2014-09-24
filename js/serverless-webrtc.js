/* See also:
    http://www.html5rocks.com/en/tutorials/webrtc/basics/
    https://code.google.com/p/webrtc-samples/source/browse/trunk/apprtc/index.html

    https://webrtc-demos.appspot.com/html/pc1.html
*/

$(document).ready(function(){

    // FB object
    var FB = new FirebaseIO("https://blistering-inferno-2587.firebaseio.com/calls");

    // Connect global object
    window.Connect = new P2PIO(FB, {'iceServers':[{'url':'stun:23.21.150.121'}]}, {'optional': [{'DtlsSrtpKeyAgreement': true}]}, 50000);
    
    // UI initialization
    $('#id').focus();

    return;



var cfg = {"iceServers":[{"url":"stun:23.21.150.121"}]},
    con = { 'optional': [{'DtlsSrtpKeyAgreement': true}] };

/* THIS IS ALICE, THE CALLER/SENDER */

var pc1icedone;
var activedc;

var pc1 = new RTCPeerConnection(cfg, con),
    dc1 = null, tn1 = null;

$('#createOrJoin').modal('hide');
$('#start').modal('hide');

$('#startBtn').click(function() {
    //$('#showLocalOffer').modal('show');
    FB.from = $('#identifier').val();
    $('#createOrJoin').modal('show');
});

$('#createBtn').click(function() {
    //$('#showLocalOffer').modal('show');
    FB.to = prompt('Enter Token');
    createLocalOffer();
});

$('#joinBtn').click(function() {
    var sink = FB.calls.child(FB.from);

    // check for incoming on sink
    console.log("Checking for incoming on " + FB.from);
    sink.on('value', function(snapshot){
        var val = snapshot.val();
        if(val){
            val = JSON.parse(val);
            console.log(val);

            if(val.src != FB.from){
                // stop listening
                sink.off('value');
                sink.remove(function(e){
                    if(e) console.log('WARN: Incoming removal failed.')
                });
                console.log("Stopped listening on " + FB.from);

                // notify user
                FB.to = val.src;
                FB.status("Incoming from ... " + val.src);

                // accept incoming
                var accept = confirm("Accept incoming from " + val.src + " ?")

                if(accept){
                    FB.status("Connecting to " + val.src);

                    handleOfferFromPC1(new RTCSessionDescription(JSON.parse(val.offer)));
                }
            }
        }
    }, function(e){
        console.log('Error identifying', FB.from);
        FB.status('Error.');
    });
});



$('#fileBtn').change(function() {
    var file = this.files[0];
    console.log(file);

    sendFile(file);
});

function fileSent(file) {
    console.log(file + " sent");
}

function fileProgress(file) {
    console.log(file + " progress");
}

function sendFile(data) {
    if (data.size) {
        FileSender.send({
          file: data,
          onFileSent: fileSent,
          onFileProgress: fileProgress,
        });
    }
}

window.sendMessage = function() {
    if ($('#messageTextBox').val()) {
        var channel = new RTCMultiSession();
        writeToChatLog($('#messageTextBox').val(), "text-success");
        channel.send({message: $('#messageTextBox').val()});
        $('#messageTextBox').val("");

        // Scroll chat text area to the bottom on new input.
        $('#chatlog').scrollTop($('#chatlog')[0].scrollHeight);
    }

    return false;
};

function setupDC1() {
    try {
        var fileReceiver1 = new FileReceiver();
        dc1 = pc1.createDataChannel('test', {reliable:true});
        activedc = dc1;
        console.log("Created datachannel (pc1)");
        dc1.onopen = function (e) {
            console.log('data channel connect');
            writeToChatLog("Connected", "text-info");
        }
        dc1.onmessage = function (e) {
            console.log("Got message (pc1)", e.data);
            if (e.data.size) {
                fileReceiver1.receive(e.data, {});
            }
            else {
                if (e.data.charCodeAt(0) == 2) {
                   // The first message we get from Firefox (but not Chrome)
                   // is literal ASCII 2 and I don't understand why -- if we
                   // leave it in, JSON.parse() will barf.
                   return;
                }
                console.log(e);
                var data = JSON.parse(e.data);
                if (data.type === 'file') {
                    fileReceiver1.receive(e.data, {});
                }
                else {
                    writeToChatLog(data.message, "text-info");
                    // Scroll chat text area to the bottom on new input.
                    $('#chatlog').scrollTop($('#chatlog')[0].scrollHeight);
                }
            }
        };
    } catch (e) { console.warn("No data channel (pc1)", e); }
}

function createLocalOffer() {
    setupDC1();
    pc1.createOffer(function (desc) {
        pc1.setLocalDescription(desc, function () {});
        console.log("created local offer", desc);
    }, function () {console.warn("Couldn't create offer");});
}

pc1.onicecandidate = function (e) {
    console.log("ICE candidate (pc1)", e);
    if (e.candidate == null) {
        $('#localOffer').html(JSON.stringify(pc1.localDescription));
        var offer = JSON.stringify(pc1.localDescription);
        console.log(offer);

        // connect to outgoing sink sending offer
        var sink = FB.calls.child(FB.to);
        sink.set(JSON.stringify({'src': FB.from, 'offer': offer}));
        console.log("Sending offer from " + FB.from + " to " + FB.to);

        // check for status
        console.log("Checking for status");
        var src = FB.calls.child(FB.from);
        src.on('value', function(snapshot){
            var val = snapshot.val();
            if(val){
                val = JSON.parse(val);
                console.log(val);

                // stop listening
                src.off('value');
                src.remove(function(e){
                    if(e) console.log('WARN: Accept removal failed.')
                });
                console.log("Stopped listening to " + FB.from);

                // connection established
                if(FB.to == val.sink){
                    if(val.accept){
                        handleAnswerFromPC2(new RTCSessionDescription(JSON.parse(val.answer)));
                        //FB.status("Connected to " + val.sink);    
                    }
                    else {
                        FB.status("Connection Denied.");
                    }
                }
                else {
                    console.log("ERR: Mismatch in handshake.");
                }
                
            }
        });
    }
};

function handleOnconnection() {
    console.log("Datachannel connected");
    writeToChatLog("Datachannel connected", "text-success");
    $('#waitForConnection').modal('hide');
    // If we didn't call remove() here, there would be a race on pc2:
    //   - first onconnection() hides the dialog, then someone clicks
    //     on answerSentBtn which shows it, and it stays shown forever.
    $('#waitForConnection').remove();
    $('#showLocalAnswer').modal('hide');
    $('#messageTextBox').focus();
}

pc1.onconnection = handleOnconnection;

function onsignalingstatechange(state) {
    console.info('signaling state change:', state);
}

function oniceconnectionstatechange(state) {
    console.info('ice connection state change:', state);
}

function onicegatheringstatechange(state) {
    console.info('ice gathering state change:', state);
}

pc1.onsignalingstatechange = onsignalingstatechange;
pc1.oniceconnectionstatechange = oniceconnectionstatechange;
pc1.onicegatheringstatechange = onicegatheringstatechange;

function handleAnswerFromPC2(answerDesc) {
    console.log("Received remote answer: ", answerDesc);
    writeToChatLog("Received remote answer", "text-success");
    pc1.setRemoteDescription(answerDesc);
}

function handleCandidateFromPC2(iceCandidate) {
    pc1.addIceCandidate(iceCandidate);
}


/* THIS IS BOB, THE ANSWERER/RECEIVER */

var pc2 = new RTCPeerConnection(cfg, con),
    dc2 = null;

var pc2icedone = false;

pc2.ondatachannel = function (e) {
    var fileReceiver2 = new FileReceiver();
    var datachannel = e.channel || e; // Chrome sends event, FF sends raw channel
    console.log("Received datachannel (pc2)", arguments);
    dc2 = datachannel;
    activedc = dc2;
    dc2.onopen = function (e) {
        console.log('data channel connect');
        $('#waitForConnection').remove();
        writeToChatLog("Connected", "text-info");
    }
    dc2.onmessage = function (e) {
        console.log("Got message (pc2)", e.data);
        if (e.data.size) {
            fileReceiver2.receive(e.data, {});
        }
        else {
            var data = JSON.parse(e.data);
            if (data.type === 'file') {
                fileReceiver2.receive(e.data, {});
            }
            else {
                writeToChatLog(data.message, "text-info");
                // Scroll chat text area to the bottom on new input.
                $('#chatlog').scrollTop($('#chatlog')[0].scrollHeight);
            }
        }
    };
};

function handleOfferFromPC1(offerDesc) {
    pc2.setRemoteDescription(offerDesc);
    pc2.createAnswer(function (answerDesc) {
        writeToChatLog("Created local answer", "text-success");
        console.log("Created local answer: ", answerDesc);
        pc2.setLocalDescription(answerDesc);
    }, function () { console.warn("No create answer"); });
}

pc2.onicecandidate = function (e) {
    console.log("ICE candidate (pc2)", e);
    if (e.candidate == null){
       $('#localAnswer').html(JSON.stringify(pc2.localDescription));

       var answer = JSON.stringify(pc2.localDescription);

        var src = FB.calls.child(FB.to);
        src.set(JSON.stringify({'sink': FB.from, 'accept': true, 'answer': answer}));
        console.log("Sending answer from " + FB.from + " to " + FB.to);
    }
};

pc2.onsignalingstatechange = onsignalingstatechange;
pc2.oniceconnectionstatechange = oniceconnectionstatechange;
pc2.onicegatheringstatechange = onicegatheringstatechange;

function handleCandidateFromPC1(iceCandidate) {
    pc2.addIceCandidate(iceCandidate);
}

pc2.onaddstream = function (e) {
    console.log("Got remote stream", e);
    var el = new Audio();
    el.autoplay = true;
    attachMediaStream(el, e.stream);
};

pc2.onconnection = handleOnconnection;


});

function getTimestamp() {
    var totalSec = new Date().getTime() / 1000;
    var hours = parseInt(totalSec / 3600) % 24;
    var minutes = parseInt(totalSec / 60) % 60;
    var seconds = parseInt(totalSec % 60);

    var result = (hours < 10 ? "0" + hours : hours) + ":" +
                 (minutes < 10 ? "0" + minutes : minutes) + ":" +
                 (seconds  < 10 ? "0" + seconds : seconds);

    return result;
}

function writeToChatLog(message, message_type) {
    document.getElementById('chatlog').innerHTML += '<p class=\"' + message_type + '\">' + "[" + getTimestamp() + "] " + message + '</p>';
}


