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
    var select = document.getElementById("repository");
    var repos = window.arguments[0].inn.rep;
    
    for (var i = 0; i < repos.length; i++) {
        var option = document.createElement('option');
        option.text = repos[i].name;
        option.value = repos[i].id;
        select.add(option, null);
    }
}

/**
 * Called when OK button is clicked.
 * 
 * @return  true.
 */
function onOK() {
   window.arguments[0].out = document.getElementById("repository").value;

   return true;
}
