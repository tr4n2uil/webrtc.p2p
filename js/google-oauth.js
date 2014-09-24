/**
 *  Google OAuth Login Wrapper
 *
 *  Vibhaj Rajan <vibhaj8@gmail.com>
 *
 *  Licensed under MIT License 
 *  http://www.opensource.org/licenses/mit-license.php
 *
**/

https://accounts.google.com/o/oauth2/auth?scope=https://www.googleapis.com/auth/userinfo.profile%20https://www.googleapis.com/auth/userinfo.email&client_id=935545233520-2fpt6am5n4n5229b2c8kd35la1gb95bh.apps.googleusercontent.com&redirect_uri=http://127.0.0.1/&response_type=token

window.GoogleOAuth = function(scope, clientid, redirect){
  var accessToken = $.cookie('google-outh-access-token');
  var OAUTHURL    =   'https://accounts.google.com/o/oauth2/auth?';
  var VALIDURL    =   'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=';

  //credits: http://www.netlobo.com/url_query_string_javascript.html
  function gup(url, name){
    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
    var regexS = "[\\#&]"+name+"=([^&#]*)";
    var regex = new RegExp( regexS );
    var results = regex.exec( url );
    if( results == null )
        return "";
    else
        return results[1];
  }

  return {
    validate: function(callback, error){
      var that = this;

      $.ajax({
        url: VALIDURL + accessToken,
        data: null,
        success: function(responseText){
          $.ajax({
            url: 'https://www.googleapis.com/oauth2/v1/userinfo?access_token=' + accessToken,
            data: null,
            success: function(user) {
              console.log(user);
              if(user.error){
                that.login(callback, error);
              }
              else
                callback(user);
            },
            error: function(e){
              that.login(callback, error);
            },
            dataType: "jsonp"
          });
        },
        error: function(e){
          that.login(callback, error);
        },
        dataType: "jsonp"  
      });
    },

    login: function(callback, error){
      var that = this;
      var url = OAUTHURL + 'scope=' + scope + '&client_id=' + clientid + '&redirect_uri=' + redirect + '&response_type=token';
      var popup = window.open(url, "google-auth", 'width=800, height=600');

      var timer = window.setInterval(function(){
        try {
          //console.log(popup.document.URL, redirect, popup.document.URL.indexOf(redirect));
          if (popup.document.URL.indexOf(redirect) != -1) {
            window.clearInterval(timer);
            var url =   popup.document.URL;
            accessToken =   gup(url, 'access_token');
            $.cookie('google-outh-access-token', accessToken);
            popup.close();

            //that.validate(callback, error);
          }
        } 
        catch(e) {
          //error(e);
        }
      }, 500);
    }
  };
}
