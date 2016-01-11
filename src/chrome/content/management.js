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

/**
 * Updates interface when provider is loading.
 */
function onLoadProvider(provider) {
    var messenger = Components.classes["@mozilla.org/messenger;1"]
            .createInstance(Components.interfaces.nsIMessenger);

    var service = document.getElementById("service");
    service.setAttribute("href", provider.serviceURL);
    service.appendChild(document.createTextNode(provider.displayName));

    var totalSpace = provider.fileSpaceUsed + provider.remainingFileSpace;
    var usedSpace = provider.fileSpaceUsed;
    var remainingSpace = totalSpace - usedSpace;

    var usedSpaceBar = document.getElementById("used-space-bar");
    var remainingSpaceBar = document.getElementById("remaining-space-bar");
    var remainingSpaceFill = document.getElementById("remaining-space-fill");
    var remainingSpaceSwatch = document.getElementById("remaining-space-swatch");

    if (totalSpace < 0) {
        if (usedSpace > 0) {
            usedSpaceBar.style.width = "100%";
            remainingSpaceBar.style.display = "none";
        } else {
            usedSpaceBar.style.display = "none";
            remainingSpaceBar.style.width = "100%";
        }
    } else {
        usedSpaceBar.style.width = (100 * usedSpace / totalSpace) + "%";
        remainingSpaceBar.style.width = (100 * remainingSpace / totalSpace) + "%";
        
        if (100 * remainingSpace / totalSpace <= 15 ) {
            remainingSpaceFill.className = "red";
            remainingSpaceSwatch.className = "space-swatch red";
        } else if (100 * remainingSpace / totalSpace <= 25 ) {
            remainingSpaceFill.className = "yellow";
            remainingSpaceSwatch.className = "space-swatch yellow";
        } else {
            remainingSpaceFill.className = "blue";
            remainingSpaceSwatch.className = "space-swatch blue";
        }
    }
    
    var fileSpaceUsed = document.getElementById("file-space-used");
    fileSpaceUsed.textContent = messenger.formatFileSize(usedSpace);

    var remainingFileSpace = document.getElementById("remaining-file-space");
    remainingFileSpace.textContent = messenger.formatFileSize(remainingSpace);
    if (remainingSpace < 0) {
        remainingFileSpace.textContent =
            document.getElementById("unknown-fix").textContent;
    }
}
