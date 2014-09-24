/**
 *  WebRTC IO Wrappers
 *
 *  Vibhaj Rajan <vibhaj8@gmail.com>
 *
 *  Licensed under MIT License 
 *  http://www.opensource.org/licenses/mit-license.php
 *
**/

window.WebRTCIO = function(ice, options){
  var pc = new RTCPeerConnection(ice, options);
  var dc = null;

  pc.onconnection = function(){
    console.log("Datachannel connected");
  };

  pc.onsignalingstatechange = function(state) {
      console.info('signaling state change:', state);
  }

  pc.oniceconnectionstatechange = function(state) {
      console.info('ice connection state change:', state);
  }

  pc.onicegatheringstatechange = function(state) {
      console.info('ice gathering state change:', state);
  }

  return {

    setupChannel: function(key, onopen, onclose, onmessage){
      try {
        dc = pc.createDataChannel(key, {reliable:true});
        console.log("Created datachannel: ", key);

        dc.onopen = onopen;
        dc.onclose = onclose;
        dc.onmessage = function (e) {
            console.log("Got message: ", e.data);
              if (e.data.charCodeAt(0) == 2) {
                 // The first message we get from Firefox (but not Chrome)
                 // is literal ASCII 2 and I don't understand why -- if we
                 // leave it in, JSON.parse() will barf.
                 return;
              }

              onmessage(JSON.parse(e.data));
        };
      }
      catch (e) { 
        console.warn("No data channel (pc1)", e);
      }
    },

    waitForChannel: function(onopen, onclose, onmessage){
      pc.ondatachannel = function (e) {
          var datachannel = e.channel || e; // Chrome sends event, FF sends raw channel
          console.log("Received datachannel", arguments);

          dc = datachannel;
          dc.onopen = onopen;
          dc.onclose = onclose;
          dc.onmessage = function (e) {
              console.log("Got message: ", e.data);
              onmessage(JSON.parse(e.data));
          };
      }
    },

    setupStream: function(audio, video, callback){
      getUserMedia({audio: audio, video: video}, function(stream){
        pc.addStream(stream);
        callback(stream);
      }, 
      function(){
        console.log('Error setting up streams');
      });
    },

    waitForStream: function(callback){
      pc.onaddstream = callback;
    },

    createOffer: function(callback){
      console.log("Creating offer");

      pc.createOffer(function (desc) {
          pc.setLocalDescription(desc, function () {});
          console.log("created local offer", desc);
      }, 
      function () {
        console.warn("Couldn't create offer");
      });

      pc.onicecandidate = function (e) {
        console.log("ICE candidate", e);
        // if (e.target.iceGatheringState == "complete") { 
        //   pc.createOffer(function(offer) {
        //     console.log("Offer with ICE candidates: " + offer.sdp);
        //   });
        // }
        if (e.candidate == null) {
            var offer = JSON.stringify(pc.localDescription);
            callback(offer);
        }
      }
    },

    createAnswer: function(offer, callback){
      pc.setRemoteDescription(offer);
      pc.createAnswer(function (answerDesc) {
          console.log("Created local answer: ", answerDesc);
          pc.setLocalDescription(answerDesc);
      }, 
      function () { 
        console.warn("No create answer"); 
      });

      pc.onicecandidate = function (e) {
          console.log("ICE candidate (pc2)", e);
          if (e.candidate == null){
            var answer = JSON.stringify(pc.localDescription);
            callback(answer);
          }
      };
    },

    receiveAnswer: function(answer){
      pc.setRemoteDescription(answer);
    },

    getChannel: function(){
      return dc;
    },

    closeChannel: function(){
      if(dc){
        dc.close();
        console.log('Closed data channel');
      }
    }
  }
}
