/*
 * Pydio for Filelink is an extension for Mozilla Thunderbird that allows
 * you to easily send file attachments by uploading them to an storage service
 * that uses Pydio as file management system.
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
 * Collects and sends all parameters to the provider implementation.
 */
function extraArgs() {
    var displayName = document.getElementById("display-name").value;

    var baseURL = document.getElementById("base-url").value.trim();
    if (baseURL[baseURL.length - 1] != '/') {
        baseURL += "/";
    }

	var username = document.getElementById("username").value;

    var totalStorage = "-1";
    if (document.getElementById("total-storage-enabled").checked
            && document.getElementById("total-storage").value != "") {
        totalStorage = document.getElementById("total-storage").value + " "
            + document.getElementById("total-storage-unit").value;
    }

	return {
        "displayName":  { type : "char", value : displayName  },
        "baseURL":      { type : "char", value : baseURL      },
        "username":     { type : "char", value : username     },
        "password":     { type : "char", value : ""           },
        "repositoryId": { type : "char", value : "-1"         },
        "totalStorage": { type : "char", value : totalStorage },
	};
}

/**
 * Changes username and password when selected account changes.
 */
function changeAccount() {
    var select = document.getElementById("account");

    if (select.value != "custom") {
        document.getElementById('username').value =
            select.options[select.selectedIndex].textContent;
        document.getElementById('username').disabled = true;
    } else {
        document.getElementById('username').value =
            document.getElementById('username-text').textContent;
        document.getElementById('username').disabled = false;
    }
}

/**
 * Removes duplicates values in the array.
 *
 * @param array  Array with duplicated values
 * @return       Array without duplicates
 */
function clearArray(array) {
    var results = [];

    for (var i = 0; i < array.length; i++) {
        var j = 0;
        while (j < results.length && array[i].username != results[j].username
                && array[i].password != results[j].password) {
            j++;
        }

        if (j >= results.length) {
            results.push(array[i]);
        }
    }

    return results;
}

/**
 * Finds all configured accounts in thunderbird and adds them to the select box.
 */
function createAccountSelectBox() {
    var select = document.getElementById("account");

    var loginManager = Components.classes["@mozilla.org/login-manager;1"]
               .getService(Components.interfaces.nsILoginManager);
    var logins = loginManager.getAllLogins();

    logins = clearArray(logins);

    var customOption = document.getElementById("custom-option");
    for (var i = 0; i < logins.length; i++) {
        var option = document.createElement('option');
        option.setAttribute("value", logins[i].password);
        option.appendChild(document.createTextNode(logins[i].username));
        select.add(option, customOption);
    }
    select.selectedIndex = 0;

    changeAccount();
}

/**
 * Enables/disables input text objects if the checkbox is checked/unchecked.
 *
 * @param ths  Checkbox to check.
 */
function enable(ths) {
    var check = ths.getAttribute("id");

    if (check == "total-storage-enabled") {
        if (ths.checked) {
            document.getElementById("total-storage").disabled = false;
            document.getElementById("total-storage-unit").disabled = false;
        } else {
            document.getElementById("total-storage").disabled = true;
            document.getElementById("total-storage-unit").disabled = true;
        }
    }
}

/**
 * Checks if current input text value is a number.
 *
 * @param ths  Input text to validate.
 */
function number(ths) {
    var pattern = /^[1-9]\d*(\.\d+)?$/;

    if(!pattern.test(ths.value)) {
        ths.value = "";
    }
}

/**
 *  Updates interface when provider is loading.
 */
function onLoadProvider() {
    createAccountSelectBox();
    enable(document.getElementById("total-storage-enabled"));
}
