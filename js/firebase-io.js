/**
 *  Firebase IO Wrappers
 *
 *  Vibhaj Rajan <vibhaj8@gmail.com>
 *
 *  Licensed under MIT License 
 *  http://www.opensource.org/licenses/mit-license.php
 *
**/

window.FirebaseIO = function(url){

  // forebase object
  var fb = new Firebase(url);

  return {
    listen: function(key, callback, timeout){
      var listener = fb.child(key);

      // listen for changes to key
      console.log("Listening on " + key);
      listener.on('value', function(snapshot){
          var val = snapshot.val();
          if(val){
              val = JSON.parse(val);
              console.log("New value for key: [", key, "] ", val);

              callback(key, val);
              //FB.cancel(key, listener);
              listener.remove(function(e){
                if(e) console.log('WARN: removal failed.')
              });
          }
      },
      function(e){
          console.log('Error listening to ', key);
      });

      if(timeout){
        window.setTimeout(function(){
          this.cancel(key, listener);
        }, timeout);
      }
    },

    update: function(key, value, timeout, callback){
      var node = fb.child(key);
      node.set(value);
      console.log("Update key [" + key + "] to " + value);

      if(timeout){
        window.setTimeout(function(){
          node.remove(function(e){
              if(e) console.log('WARN: removal failed.')
              callback(key, e);
          });
        }, timeout);
      }
    },

    cancel: function(key, listener){
      var listener = listener || fb.child(key);

      // stop listening
      console.log("Stopping listening on " + key);
      listener.off('value');
      listener.remove(function(e){
          if(e) console.log('WARN: removal failed.')
      });
    }
  }
}
