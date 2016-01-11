/*
 * AjaXplorer for Filelink is an extension for Mozilla Thunderbird that allows
 * you to easily send file attachments by uploading them to an storage service
 * that uses AjaXplorer as file management system.
 * 
 * Copyright (C) 2013  Diego Blanco Estévez
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

Cu.import("chrome://ajaxplorer-for-filelink/content/defs.js");

/**
 *  Called on dialog load.
 */
function onLoad() {
    document.getElementById("username").appendChild(document.createTextNode(
        window.arguments[0].inn.username));
    document.getElementById("captcha-image").setAttribute("src",
        window.arguments[0].inn.captchaURL);

    if (window.arguments[0].inn.status != A4F_ACCOUNT_LOCKED) {
        document.getElementById("captcha-image-row").style.display = "none";
        document.getElementById("captcha-code-row").style.display = "none";
    }
}

/**
 * Called when OK button is clicked.
 * 
 * @return  true.
 */
function onOK() {
   window.arguments[0].out = {
       captchaCode: document.getElementById("captcha-code").value,
       password: document.getElementById("password").value
   };

   return true;
}

/**
 * Gets a new captcha when image is clicked.
 * 
 * @param ths  Image element.
 */
function reloadImg(ths) {
    var src = ths.src;
    ths.src = "";

    var i = src.indexOf('&v');

    if (i >= 0) {
        src = src.substr(0, i);
    }

    var date = new Date();
    ths.src = src + '&v=' + date.getTime();
}
