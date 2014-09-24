/**
 *  JavaScript UI Utilities
 *
 *  Vibhaj Rajan <vibhaj8@gmail.com>
 *
 *  Licensed under MIT License 
 *  http://www.opensource.org/licenses/mit-license.php
 *
**/

window.UI = window.UI || {};

UI.show = function(element, child){
    $(element).children().hide();
    $(child).removeClass('hidden').fadeIn(500);
}

UI.status = function(data){
    console.log(data);
}
