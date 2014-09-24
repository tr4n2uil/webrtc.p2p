/**
 *  P2P RTC IO Wrappers
 *
 *  Vibhaj Rajan <vibhaj8@gmail.com>
 *
 *  Licensed under MIT License 
 *  http://www.opensource.org/licenses/mit-license.php
 *
**/

window.P2PIO = function(FB, ice, options, timeout){
  var p2pio = {
    onCall: false,
    channel: null,
    timeout: timeout,

    self: new WebRTCIO(ice, options),
    peer: new WebRTCIO(ice, options),

    me: null,
    to: null,

    login: function(){
      this.me = $('#me').val();
      UI.show('#menu', '#chat');
      $('#me-id').html(this.me);
      $('#token').focus();
      this.incoming();
      return false;
    },

    chat: function(){
      this.to = $('#token').val();
      UI.show('#menu', '#connecting');
      this.outgoing({data:true});
      return false;
    },

    videoChat: function(){
      this.to = $('#token').val();
      UI.show('#menu', '#connecting');
      this.outgoing({data:true, audio: true, video: true});
      return false;
    },

    screenShare: function(){
      this.to = $('#token').val();
      UI.show('#menu', '#connecting');
      this.outgoing({data:true, video: {mandatory: {chromeMediaSource: 'screen',maxWidth: window.screen.width,maxHeight: window.screen.height,maxFrameRate: 3}}});
      return false;
    },

    disconnect: function(e){
      this.self.closeChannel();
      this.peer.closeChannel();
      this.onCall = false;

      UI.show('#menu', '#chat');
      $('#token').focus();
      return false;
    },

    outgoing: function(options){
      var that = this;

      if(options.data){
        // setup channel
        this.peer.setupChannel('test',
          function(e){
            console.log('data channel connect');
            writeToChatLog("Connected", "text-info");
            that.onCall = true;
            that.channel = that.peer.getChannel();

            $('#peer').html(Connect.to);
            UI.show('#menu', '#on-call');
            $('#messageTextBox').focus();
          }, 
          function(){},
          function(data){
            writeToChatLog(data.message, "text-info");
            $('#chatlog').scrollTop($('#chatlog')[0].scrollHeight);
          }
        );
      }

      function doOffer(){
        // create offer
        that.peer.createOffer(function(offer){
          FB.update(that.to, JSON.stringify({'src': that.me, 'offer': offer, 'options': options}), that.timeout, function(){
            if(!that.onCall){
              console.log("Unable to connect");
              that.disconnect();
            }
          });
        });
      }

      if(options.video || options.audio || false){
        this.peer.setupStream(options.audio || false, options.video || false, function(stream){
          var local_video = document.getElementById('local_video');
          local_video.src = window.URL.createObjectURL(stream);

          doOffer();
        })
      }
      else {
        doOffer();
      }
    },

    incoming: function(){
      var that = this;

      FB.listen(this.me, function(key, val){
        // ignore when on call
        if(that.onCall){
          return;
        }

        // handle new offers
        if(val.offer || false){

          // check for cycle
          if(val.src != that.me){

            // notify user
            that.to = val.src;
            UI.status("Incoming from ... " + val.src);

            // confirm accept incoming
            var accept = confirm("Accept incoming from " + val.src + " ?");

            // process confirmation
            if(accept){
                UI.status("Connecting to " + val.src);
                UI.show('#menu', '#connecting');

                function doAnswer(){
                  that.self.createAnswer(new RTCSessionDescription(JSON.parse(val.offer)), function(answer){
                    FB.update(that.to, JSON.stringify({'sink': that.me, 'accept': true, 'answer': answer}), that.timeout, function(){
                      if(!that.onCall){
                        console.log("Unable to connect");
                        that.disconnect();
                      }
                    });
                  });
                }

                if(val.options.video || val.options.audio){
                  that.self.setupStream(val.options.audio || false, val.options.video || false, function(stream){
                    var local_video = document.getElementById('local_video');
                    local_video.src = window.URL.createObjectURL(stream);

                    doAnswer();
                  });
                }
                else {
                  doAnswer();
                }
            }
          }
          else {
            console.log('WARN: Got incoming from self');
          }
        }
        // handle answers
        else if(val.answer || false){
          // check for authentic calls
          if(that.to == val.sink){
            if(val.accept){
              that.peer.receiveAnswer(new RTCSessionDescription(JSON.parse(val.answer)));
            }
            else {
              UI.status("Connection Denied.");
            }
          }
          else {
            console.log("ERR: Mismatch in handshake.");
          }
        }
      });
    },

    sendMessage: function() {
      if ($('#messageTextBox').val()) {
          this.channel.send(JSON.stringify({message: $('#messageTextBox').val()}));

          writeToChatLog($('#messageTextBox').val(), "text-success");
          $('#chatlog').scrollTop($('#chatlog')[0].scrollHeight);
          $('#messageTextBox').val("");
      }

      return false;
    }
  }

  p2pio.self.waitForChannel(
    function(e){
      console.log('Data channel connected.');
      writeToChatLog('Connected', "text-info");
      p2pio.onCall = true;
      p2pio.channel = p2pio.self.getChannel();

      $('#peer').html(p2pio.to);
      UI.show('#menu', '#on-call');
      $('#messageTextBox').focus();
    },
    function(){},
    function(data){
      writeToChatLog(data.message, "text-info");
      $('#chatlog').scrollTop($('#chatlog')[0].scrollHeight);
    }
  );

  p2pio.self.waitForStream(function (e) {
    var remote_video = document.getElementById('remote_video');
    remote_video.src = window.URL.createObjectURL(e.stream);
  });

  p2pio.peer.waitForStream(function (e) {
    var remote_video = document.getElementById('remote_video');
    remote_video.src = window.URL.createObjectURL(e.stream);
  });

  return p2pio;
}
