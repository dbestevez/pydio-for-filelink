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

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/gloda/log4moz.js");
Cu.import("resource:///modules/cloudFileAccounts.js");
Cu.import("chrome://ajaxplorer-for-filelink/content/defs.js");


/////////////////////////
// nsAjaXplorer Object //
/////////////////////////
function nsAjaXplorer() {
    this.log = Log4Moz.getConfiguredLogger("AjaXplorer4Filelink");
}

nsAjaXplorer.prototype = {

    // nsISupports
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIMsgCloudFileProvider]),

    classID: Components.ID("{0a2c6470-5822-11e2-bcfd-0800200c9a66}"),

    get type() "AjaXplorer",
    get displayName() this._displayName,
    get serviceURL() this._baseURL,
    get iconClass() A4F_URL_ICON,
    get accountKey() this._accountKey,
    get lastError() this._lastErrorText,
    get settingsURL() A4F_URL_SETTINGS,
    get managementURL() A4F_URL_MANAGEMENT,
    get fileUploadSizeLimit() this._uploadMaxFileSize,
    get remainingFileSpace() this._totalStorage - this._fileSpaceUsed,
    get fileSpaceUsed() this._fileSpaceUsed,

    _accountKey: null,
    _prefBranch: null,

    _displayName: "AjaXplorer",
    _baseURL: "",
    _username: "",
    _password: "",
    _secureToken: "",
    _loginSeed: "",
    _loginStatus: A4F_LOG_OK,
    _loginRetry: 0,
    _repositoryId: -1,

    _totalStorage: 0,
    _uploadMaxFileSize: 0,
    _fileSpaceUsed: 0,

    _uploads: [],


    /**
     * Initializes an nsIMsgCloudFileProvider to be associated with a
     * particular account. This should probably be called immediately
     * after instantiation.
     *
     * @param aAccountKey  The account key that this instance of the
     *                     nsIMsgCloudFileProvider should be associated with.
     */
    init: function init(aAccountKey) {
        this._accountKey = aAccountKey;
        this._prefBranch = Services.prefs.getBranch(
                "mail.cloud_files.accounts." + aAccountKey + ".");

        if (this._prefBranch.getCharPref("displayName") != "") {
            this._displayName = this._prefBranch.getCharPref("displayName");
        }

        this._baseURL = this._prefBranch.getCharPref("baseURL");
        this._username = this._prefBranch.getCharPref("username");

        if (this._password == "") {
            this._getUpdatedPassword();
        }

        this._totalStorage = this._parseSize(
            this._prefBranch.getCharPref("totalStorage"));

        if (this._prefBranch.prefHasUserValue("repositoryId")) {
            this._repositoryId = this._prefBranch.getCharPref("repositoryId");
        }
    },

    /**
     * Attempts to communicate with the service provider in order to get the
     * proper credentials for starting uploads.
     *
     * @param aCallback  The nsIRequestObserver for monitoring the start and
     *                   stop states of the creation operation.
     */
    createExistingAccount: function createExistingAccount(aRequestObserver) {
        let failureCb = function() {
            aRequestObserver.onStopRequest(null, this,
                    Ci.nsIMsgCloudFileProvider.authErr);
        }.bind(this);

        let successCb = function() {
            aRequestObserver.onStopRequest(null, this, Cr.NS_OK);
        }.bind(this);

        this.login(successCb, failureCb);
    },

    /**
     * Creates a new user account for the storage provider represented by the
     * nsIMsgCloudFileProvider.
     *
     * @throws NS_ERROR_NOT_IMPLEMENTED
     */
    createNewAccount: function createNewAccount() {
        throw Cr.NS_ERROR_NOT_IMPLEMENTED;
    },

    /**
     * Refreshes the data for this user account.
     *
     * @param aWithUI    Whether or not the provider should prompt the user for
     *                   credentails in the event that the stored credentials
     *                   have gone stale. If aWithUI is false, and the
     *                   credentials are stale, the onStopRequest of the
     *                   aCallback. nsIRequestListener will get the authErr
     *                   status code passed to it.
     * @param aCallback  The nsIRequestObserver for monitoring the start and
     *                   stop states of the refresh operation.
     */
    refreshUserInfo: function refreshUserInfo(aWithUI, aCallback) {
        if (Services.io.offline) {
            throw Ci.nsIMsgCloudFileProvider.offlineErr;
        }

        let failureCb = function() {
            aCallback.onStopRequest(null, this,
                 Ci.nsIMsgCloudFileProvider.authErr);
        }.bind(this);

        // 1. Login
        let successCb = function() {
            // 2. Load account settings
            let successCb = function() {
                // 3. Switch repository
                let successCb = function() {
                    // 4. Check upload folder
                    let successCb = function() {
                        // 5. Get user info
                        let successCb = function() {
                            aCallback.onStopRequest(null, this, Cr.NS_OK);
                        }.bind(this)

                        this._getUserInfo(successCb, failureCb);
                    }.bind(this);

                    this.uploadFolderExists(successCb, failureCb);
                }.bind(this);

                this.switchRepository(this._repositoryId,
                    successCb, failureCb);
            }.bind(this);

            this._getAccountInfo(successCb, failureCb);
         }.bind(this);

        this.login(successCb, failureCb);
    },

    /**
     * Starts a file upload for this account.
     *
     * @param aFile      The file to be uploaded.
     * @param aCallback  The nsIRequestObserver callback to receive request
     *                   start and stop notices.
     *
     * @throws nsIMsgCloudFileProvider.offlineErr if we are offline.
     */
    uploadFile: function nsA4F_uploadFile(aFile, aCallback) {
        if (Services.io.offline) {
            throw Ci.nsIMsgCloudFileProvider.offlineErr;
        }

        // 1. Login
        let failureCb = function() {
            aCallback.onStopRequest(null, this,
                        Ci.nsIMsgCloudFileProvider.authErr);
        }.bind(this);

        let successCb = function() {
            // 2. Switch repository
            let failureCb = function() {
                aCallback.onStopRequest(null, this,
                        Ci.nsIMsgCloudFileProvider.uploadErr);
            }.bind(this);

            let successCb = function() {
                // 3. Check upload folder
                let successCb = function() {
                    // 4. Update account details
                    let successCb = function() {
                        // 5. Upload file
                        if (this._uploadMaxFileSize > -1
                            && aFile.fileSize > this._uploadMaxFileSize) {
                            // Exceed file limit (filesize > max)
                            aCallback.onStopRequest(null, this,
                                Ci.nsIMsgCloudFileProvider
                                    .uploadExceedsFileLimit);

                        } else if (this._uploadMaxFileSize > -1
                            && this._totalStorage > -1 && this._totalStorage
                                    - this._fileSpaceUsed < aFile.fileSize) {
                            // Exceed quota (No space)
                            aCallback.onStopRequest(null, this,
                                Ci.nsIMsgCloudFileProvider
                                    .uploadWouldExceedQuota);

                        } else {
                            // Queue this request
                            this._uploads.push(new nsAXPUploader(this._username,
                                this._password, this._baseURL,
                                    aFile, aCallback));

                            // Check if upload can be started
                            var i = 0;
                            while (i < this._uploads.length
                                    && this._uploads[i].state != UPLOADING
                                    && this._uploads[i].state != READY) {
                                i++;
                            }

                            if (i < this._uploads.length &&
                                    this._uploads[i].file.equals(aFile)) {

                                let successCb = function() {
                                    aCallback.onStopRequest(null, this,
                                        Cr.NS_OK);

                                    this.resumeUpload();
                                }.bind(this);

                                this._uploads[i].uploadFile(this._secureToken,
                                    successCb, failureCb);
                            }
                        }
                    }.bind(this);

                    this._getAccountInfo(successCb, failureCb);
                }.bind(this);

                this.uploadFolderExists(successCb, failureCb);
            }.bind(this);

            this.switchRepository(this._repositoryId,
                successCb, failureCb);
        }.bind(this);

        this.login(successCb, failureCb);
    },

    /**
     * Returns the sharing URL for some uploaded file.
     *
     * @param aFile  The previously uploaded file to get the URL for.
     */
    urlForFile: function nsA4F_urlForFile(aFile) {
        var i = 0;
        while (i < this._uploads.length
                && !this._uploads[i].file.equals(aFile)) {
            i++;
        }

        if (i < this._uploads.length) {
            return this._uploads[i].shareURL;
        } else {
            return "";
        }
    },

    /**
     * Cancels an upload currently in progress for some nsIFile. If it hasn't
     * started yet, it will be removed from the upload queue.
     *
     * @param aFile  The nsIFile that is currently being uploaded to cancel.
     */
    cancelFileUpload: function nsA4F_cancelFileUpload(aFile) {
        var i = 0;
        while (i < this._uploads.length &&
                !this._uploads[i].file.equals(aFile)) {
            i++;
        }

        if (i < this._uploads.length) {
            this._uploads[i].cancelFileUpload();
            this._uploads.splice(i,1);
        }

        this.resumeUpload();
    },

    /**
     * Attempts to delete a file that had previously been uploaded using this
     * instance.
     *
     * @param aFile      The file that was previously uploaded using this
     *                   nsIMsgCloudFileProvider instance that should be
     *                   deleted.
     * @param aCallback  The nsIRequestObserver for monitoring the start and
     *                   stop states of the delete operation.
     */
    deleteFile: function nsA4F_deleteFile(aFile, aCallback) {
        if (Services.io.offline) {
            throw Ci.nsIMsgCloudFileProvider.offlineErr;
        }

        var i = 0;
        while (i < this._uploads.length &&
                !this._uploads[i].file.equals(aFile)) {
            i++;
        }

        if (i < this._uploads.length) {
            // 1. Login
            let failureCb = function() {
                aCallback.onStopRequest(null, this,
                    Ci.nsIMsgCloudFileProvider.authErr);
            }.bind(this);

            let successCb = function() {
                // 2. Switch repository (default files)
                let successCb = function() {
                    // 3. Check upload folder
                    let successCb = function() {
                        // 4. Delete file
                        let failureCb = function() {
                            aCallback.onStopRequest(null, this,
                                Ci.nsIMsgCloudFileProvider.uploadErr);
                        }.bind(this);

                        let successCb = function() {
                            // 5. Switch repository (shared files)
                            let successCb = function() {
                                // 6. Delete shared file (link)
                                let successCb = function() {
                                    aCallback.onStopRequest(null, this,
                                        Cr.NS_OK);
                                }.bind(this);

                                this._uploads[i].deleteSharedFile(
                                    this._secureToken, successCb, failureCb);
                                this._uploads.splice(i, 1);
                            }.bind(this);

                            this.switchRepository(A4F_SHARED_FILES_REPOSITORY,
                                successCb, failureCb);
                        }.bind(this);

                        this._uploads[i].deleteFile(this._secureToken,
                            successCb, failureCb);
                    }.bind(this);

                    this.uploadFolderExists(successCb, failureCb);
                }.bind(this);

                this.switchRepository(this._repositoryId, successCb,
                    failureCb);
            }.bind(this);

            this.login(successCb, failureCb);
        }
    },

    /**
     * Returns an appropriate provider-specific URL for dealing with a
     * particular error type.
     *
     * @param aError an error to get the URL for.
     */
    providerUrlForError: function nsA4F_providerUrlForError(aError) {
        return "";
    },

    /**
     * Gets new auth tokens (secure_token, login_seed and captcha code).
     *
     * @param successCallback  Called if auth tokens has been recovered
     *                         successfully.
     * @param failureCallback  Called back on error.
     */
    getAuth: function nsA4F_getAuth(successCallback, failureCallback) {
        let successCb = function() {
            this._getLoginSeed(successCallback, failureCallback);
        }.bind(this);

        this._getSecureToken(successCb, failureCallback);
    },

    /**
     * Tries to find out if current user is already logged in.
     *
     * @param successCallback  Called if auth tokens has been recovered
     *                         successfully.
     * @param failureCallback  Called back on error.
     */
    isLogged: function nsA4F_isLogged(successCallback, failureCallback) {
        let url = this._baseURL
            + "index.php?secure_token=" + this._secureToken
            + "&get_action=" + A4F_ACTION_LS

        let req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                .createInstance(Ci.nsIXMLHttpRequest);
        req.open("POST", url, true, this._username, this._password);

        req.onerror = function() {
            this._isLogged = false;

            aRequestObserver.onStopRequest(null, this,
                Ci.nsIMsgCloudFileProvider.authErr);
        }.bind(this);

        req.onload = function() {
            if (req.responseXML == null) {
                this._isLogged = false;
            } else {
                var items =
                    req.responseXML.getElementsByTagName("require_auth");

                if (items.length > 0) {
                    this._isLogged = false;
                } else {
                    this._isLogged = true;
                }
            }

            if (successCallback != null) {
                successCallback();
            }
        }.bind(this);

        req.send();
    },

    /**
     * Logs into the AjaXplorer account.
     *
     * @param successCallback  Called if login is successful.
     * @param failureCallback  Called back on error.
     */
    login: function nsA4F_login(successCallback, failureCallback) {
        let successCb = function() {
            let successCb = function() {
                if (!this._isLogged) {
                    this._login(successCallback, failureCallback);
                } else {
                    if (successCallback != null) {
                        successCallback();
                    }
                }
            }.bind(this);

            this.isLogged(successCb, failureCallback);
        }.bind(this);

        this.getAuth(successCb, failureCallback);
    },

    /**
     * Calculates md5 from string.
     *
     * @param toMD5  Input string.
     * @return       Value MD5 in hexadecimal.
     */
    md5: function nsA4F_md5(toMD5) {
        var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
                .createInstance(Ci.nsIScriptableUnicodeConverter);
        converter.charset = "UTF-8";

        // result is an out parameter,
        // result.value will contain the array length
        var result = {};
        // data is an array of bytes
        var data = converter.convertToByteArray(toMD5, result);
        var ch = Cc["@mozilla.org/security/hash;1"]
                .createInstance(Ci.nsICryptoHash);
        ch.init(ch.MD5);

        ch.update(data, data.length);
        var hash = ch.finish(false);

        // return the two-digit hexadecimal code for a byte
        function toHexString(charCode) {
          return ("0" + charCode.toString(16)).slice(-2);
        }

        // convert the binary hash data to a hex string.
        var s = [toHexString(hash.charCodeAt(i)) for (i in hash)].join("");

        return s;
    },


    /**
     * Returns the index of next upload that can be started.
     *
     * @return  Index of next upload that can be started or -1 if there isn't
     *          any upload..
     */
    nextUpload: function nsA4F_nextUpload() {
        var i = 0;
        while (i < this._uploads.length
                && !(this._uploads[i].state == READY)) {
            i++;
        }

        if (i < this._uploads.length) {
            return i;
        } else {
            return -1;
        }
    },

    /**
     * Starts the next file upload in the uploads queue.
     */
    resumeUpload: function nsA4F_resumeUpload() {
        if (Services.io.offline) {
            throw Ci.nsIMsgCloudFileProvider.offlineErr;
        }

        let nxtUpl = this.nextUpload();

        if (nxtUpl > -1 && nxtUpl < this._uploads.length) {
            let failureCb = function() {
                this._uploads[nxtUpl].requestObserver.onStopRequest(null,
                    this, Ci.nsIMsgCloudFileProvider.authErr);
            }.bind(this);

            // 1. Login
            let successCb = function() {
                // 2. Switch repository
                let successCb = function() {
                    // 3. Check upload folder
                    let successCb = function() {
                        // 4. Upload file
                        let successCb = function() {
                            this._uploads[nxtUpl].requestObserver
                                .onStopRequest(null, this, Cr.NS_OK);
                        }.bind(this);

                        this._uploads[nxtUpl].uploadFile(
                            this._secureToken, successCb, failureCb);
                    }.bind(this);

                    this.uploadFolderExists(successCb, failureCb);
                }.bind(this);

                this.switchRepository(this._repositoryId,
                    successCb, failureCb);
            }.bind(this);

            this.login(successCb, failureCb);
        }
    },

    /**
     * Changes the current work repository.
     *
     * @param repositoryId     New current work repository id
     * @param successCallback  Called if the repository changed successfully.
     * @param failureCallback  Called back on error.
     */
    switchRepository: function nsA4F_switchRepository(repositoryId,
            successCallback, failureCallback) {
        let url = this._baseURL
            + "index.php?secure_token=" + this._secureToken
            + "&get_action=" + A4F_ACTION_SWITCH_REPOSITORY
            + "&repository_id=" + repositoryId;

        let req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                .createInstance(Ci.nsIXMLHttpRequest);
        req.open("POST", url, true, this._username, this._password);

        req.onerror = function() {
            if (failureCallback != null) {
                failureCallback();
            }
        }.bind(this);

        req.onload = function() {
            if (successCallback != null) {
                successCallback();
            }
        }.bind(this);

        req.send();
    },

    /**
     * Checks if the upload folder exists.
     *
     * @param successCallback  Called if checkup is successful.
     * @param failureCallback  Called back on error.
     */
    uploadFolderExists: function nsA4F_uploadFolderExists(
            successCallback, failureCallback) {
        let url = this._baseURL
            + "index.php?secure_token=" + this._secureToken
            + "&action=" + A4F_ACTION_LS
            + "&options=al"
            + "&dir=" + encodeURIComponent(A4F_ROOT_DIR);

        let req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                .createInstance(Ci.nsIXMLHttpRequest);
        req.open("POST", url, true, this._username, this._password);

        req.onerror = function() {
            if (failureCallback != null) {
                failureCallback();
            }
        }.bind(this);

        req.onload = function() {
            var items = req.responseXML.getElementsByTagName("tree");

            var i = 0;
            while (i < items.length
                    && items[i].getAttribute("text") != A4F_UPLOAD_DIR_NAME) {
                i++;
            }

            if (i < items.length) {
                if (successCallback != null) {
                    successCallback();
                }
            } else {
                this._createUploadFolder(successCallback, failureCallback);
            }

        }.bind(this);

        req.send();
    },

    /**
     * Removes duplicates values in the array.
     *
     * @param array  Array with duplicated values
     * @return       Array without duplicates
     */
    _clearArray: function nsA4F__clearArray(array) {
        var results = [];

        for (var i = 0; i < array.length - 1; i++) {
            var j = 0;
            while (j < results.length
                    && array[i].username!= results[j].username
                        && array[i].password != results[j].password) {
                j++;
            }

            if (j == results.length) {
                results.push(array[i]);
            }
        }

        return results;
    },

    /**
     * Creates a new folder in the AjaXplorer account where the files will be
     * uploaded.
     */
    _createUploadFolder: function nsA4F__createUploadFolder(
            successCallback, failureCallback) {
        let url = this._baseURL
            + "index.php?secure_token=" + this._secureToken
            + "&get_action=" + A4F_ACTION_MKDIR
            + "&dirname=" + encodeURIComponent(A4F_UPLOAD_DIR_NAME)
            + "&dir=" + encodeURIComponent(A4F_ROOT_DIR);

        let req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                .createInstance(Ci.nsIXMLHttpRequest);
        req.open("POST", url, true, this._username, this._password);

        req.onerror = function() {
            if (failureCallback != null) {
                failureCallback();
            }
        }

        req.onload = function() {
            if (successCallback != null) {
                successCallback();
            }
        }

        req.send();
    },

    /**
     * Gets the directory information in XML format
     *
     * @param dir  Directory to examine
     * @return     Information in XML format
     */
    _getDirInfo: function nsA4F__getDirInfo(dir) {
        let url = this._baseURL
            + "index.php?secure_token=" + this._secureToken
            + "&action=" + A4F_ACTION_LS
            + "&options=al"
            + "&dir=" + dir;

        let req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                .createInstance(Ci.nsIXMLHttpRequest);
        req.open("POST", url, true, this._username, this._password);

        req.onerror = function() {
            this._tmpText = null;
            this._tmpXML = null;
        }.bind(this);

        req.onload = function() {
            this._tmpText = req.responseText;
            this._tmpXML = req.responseXML;
        }.bind(this);

        req.send();
    },

    /**
     * Gets a new login seed
     *
     * @param successCallback  Called if the login seed has been recovered
     *                         successfully.
     * @param failureCallback  Called back on error.
     */
    _getLoginSeed: function nsA4F__getLoginSeed(successCallback,
            failureCallback) {
        let url = this._baseURL
                + "index.php?secure_token=" + this._secureToken
                + "&get_action=" + A4F_ACTION_GET_LOGIN_SEED;

        let req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                .createInstance(Ci.nsIXMLHttpRequest);
        req.open("POST", url, true, this._username, this._password);

        req.onerror = function() {
            this._loginSeed = "";

            if (failureCallback != null) {
                failureCallback();
            }
        }.bind(this);

        req.onload = function() {
            if (req.responseText.indexOf("{") != -1) {
                this._loginSeed = req.responseText.substring(
                    req.responseText.indexOf("seed") + 6,
                    req.responseText.indexOf(",")
                );

                if (this._loginSeed != -1) {
                    this._loginSeed = this._loginSeed.substring(1,
                        this._loginSeed.length - 1);
                }

            } else {
                this._loginSeed = req.responseText;
            }


            if (successCallback != null) {
                successCallback();
            }
        }.bind(this);

        req.send();
    },

    /**
     * Gets a new secure token.
     *
     * @param successCallback  Called if the secure token has been recovered
     *                         successfully.
     * @param failureCallback  Called back on error.
     */
    _getSecureToken: function nsA4F__getSecureToken(successCallback,
            failureCallback) {
        let url = this._baseURL
            + "index.php?get_action=" + A4F_ACTION_GET_SECURE_TOKEN;

        let req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                .createInstance(Ci.nsIXMLHttpRequest);
        req.open("POST", url, true, this._username, this._password);

        req.onerror = function() {
            this._secureToken = "";

            if (failureCallback != null) {
                failureCallback();
            }
        }.bind(this);

        req.onload = function() {
            this._secureToken = req.responseText;

            if (successCallback != null) {
                successCallback();
            }
        }.bind(this);

        req.send();
    },

    /**
     * Tries to find a updated password in the thunderbird login manager for the
     * current user.
     */
    _getUpdatedPassword: function nsA4F__getUpdatePassword() {
        var loginManager = Cc["@mozilla.org/login-manager;1"]
               .getService(Ci.nsILoginManager);

        var logins =
            loginManager.findLogins({}, this._baseURL, this._baseURL, null);

        var i = 0;
        while (i < logins.length && logins[i].hostname != this._baseURL) {
            i++;
        }

        if (i < logins.length) {
            this._password = logins[i].password;
        } else {
            this._runAuthPrompt();
        }
    },

    /**
     * Gets the upload max filesize and the available repositories for the user
     * account.
     */
    _getAccountInfo: function nsA4F__getUploadMaxFileSize(successCallback,
            failureCallback) {
        let url = this._baseURL
            + "index.php?secure_token=" + this._secureToken
            + "&action=" + A4F_ACTION_GET_XML_REGISTRY;

        let req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
             .createInstance(Ci.nsIXMLHttpRequest);
        req.open("POST", url, true, this._username, this._password);

        req.onerror = function() {

            if (failureCallback != null) {
                failureCallback();
            }
        }.bind(this);

        req.onload = function() {

            let properties = req.responseXML.getElementsByTagName("property");

            var i = 0;
            while (i < properties.length && properties[i].getAttribute("name")
                    != A4F_UPLOAD_MAX_SIZE) {
                i++;
            }

            if (i < properties.length) {
                this._uploadMaxFileSize = parseInt(properties[i].textContent);
            }

            if (this._repositoryId < 0) {
                let rep = req.responseXML.getElementsByTagName("repo");
                let repositories = new Array();
                for (var i = 0; i < rep.length; i++) {
                    if (rep[i].getAttribute("id") != "ajxp_shared"
                            && rep[i].getAttribute("id") != "ajxp_conf") {
                        repositories.push({
                            "id"   : rep[i].getAttribute("id"),
                            "name" : rep[i].getElementsByTagName("label")[0]
                                        .textContent
                        });
                    }
                }

                this._runSelectRepositoryPrompt(repositories);
            }

            if (successCallback != null) {
                successCallback();
            }
        }.bind(this);

        req.send();
    },

    /**
     * Gets the profile information for the user account associated with the
     * account key.
     *
     * @param successCallback  Called if information has been recovered
     *                         successfully.
     * @param failureCallback  Called back on error.
     */
    _getUserInfo: function nsA4F__getUserInfo(successCallback,
            failureCallback) {
        this._fileSpaceUsed = 0;
        let url = this._baseURL
            + "index.php?secure_token=" + this._secureToken
            + "&action=" + A4F_ACTION_LS
            + "&options=al"
            + "&dir=" + encodeURIComponent(A4F_UPLOAD_DIR);

        let req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
             .createInstance(Ci.nsIXMLHttpRequest);
        req.open("POST", url, true, this._username, this._password);

        req.onerror = function() {
            if (failureCallback != null) {
                failureCallback();
            }
        }.bind(this);

        req.onload = function() {
            let xmlUserInfo = req.responseXML;
            let msg = xmlUserInfo.getElementsByTagName("message");

            if (msg.length > 0 && msg[0].getAttribute("type") == "ERROR") {
                this._getUserInfo(successCallback, failureCallback);
            } else {
                this._parseXmlDirInfo(xmlUserInfo)

                if (successCallback != null) {
                    successCallback();
                }
            }
        }.bind(this);

        req.send();
    },

    /**
     * Logs into the AjaXplorer account.
     *
     * @param successCallback  Called if login is successful.
     * @param failureCallback  Called back on error.
     */
    _login: function nsA4F__login(successCallback, failureCallback) {
        var pass = this._password;

        if (this._loginSeed != "-1") {
            pass = this.md5(this.md5(this._password) + this._loginSeed);
        }

        let url = this._baseURL +
            "index.php?secure_token=" + this._secureToken
            + "&get_action=" + A4F_ACTION_LOGIN
            + "&userid=" + this._username
            + "&password=" + pass
            + "&login_seed=" + this._loginSeed;

        if (this._captchaCode != null && this._captchaCode != "") {
            url += "&captcha_code=" + this._captchaCode;
        }

        let req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                    .createInstance(Ci.nsIXMLHttpRequest);
        req.open("POST", url, true, this._username, this._password);

        req.onerror = function() {
            if (failureCallback != null) {
                failureCallback();
            }
        }.bind(this);

        req.onload = function() {
            // Get logging_result
            var loggingStatus = req.responseXML
                    .getElementsByTagName("logging_result");

            // Check logging_result
            if (loggingStatus != null && loggingStatus.length == 1) {
                var loginResult = loggingStatus[0].getAttribute("value");
                if (loginResult  == A4F_LOG_OK) {
                    var secureToken = loggingStatus[0]
                            .getAttribute("secure_token");

                    this._loginStatus = A4F_LOG_OK;
                    this._secureToken = secureToken;

                    if (successCallback != null) {
                        successCallback();
                    }

                } else {
                    if (this._loginStatus == A4F_LOG_OK
                            && loginResult == A4F_WRONG_USER) {
                        this._loginStatus = loginResult;
                        this._getUpdatedPassword();
                    } else {
                        this._loginStatus = loginResult;
                        this._runAuthPrompt();
                    }

                    if (this._loginStatus != A4F_ABORT_LOGIN) {
                        this._login(successCallback, failureCallback);
                    } else {
                        if (failureCallback != null) {
                            failureCallback();
                        }
                    }
                }
            } else {
                if (failureCallback != null) {
                    failureCallback();
                }
            }
        }.bind(this);

        req.send();
    },

    /**
     * Parses a filesize (in string)
     *
     * @param size  The filesize in string
     * @return      The filesize in bytes
     */
    _parseSize: function nsA4F__parseSize(size) {
        if (size.indexOf(" ") != -1) {
            let n = size.substring(0, size.indexOf(" ")).replace(",", ".");
            let uds = size.substring(size.indexOf(" ") + 1);

            if (uds == "b") {
                return parseFloat(n);
            } else if (uds == "Kb") {
                return parseFloat(n) * 1024;
            } else if (uds == "Mb") {
                return parseFloat(n) * 1024 * 1024;
            } else if (uds == "Gb") {
                return parseFloat(n) * 1024 * 1024 * 1024;
            }
        } else {
            return -1;
        }
    },

    /**
     * Parses an XML document which contains information about a directory.
     *
     * @param xml  Document XML with the directory information.
     */
    _parseXmlDirInfo: function nsA4F__parseXmlDirInfo(xml) {
        var dir= "";

        for (var i = 0; i < xml.childNodes[0].childNodes.length; i++) {
            var isFile = xml.childNodes[0].childNodes[i]
                    .getAttribute("is_file");

            if (isFile == "false") {
                dir += "/" + xml.childNodes[0].childNodes[i]
                        .getAttribute("text");

                let failureCb = function() {
                    this._fileSpaceUsed = 0;
                }.bind(this);

                let successCb = function() {
                    if (this._tmpXML != null) {
                        this._parseXmlDirInfo(this._tmpXML);
                    }
                }.bind(this);

                this._getDirInfo(encodeURIComponent(dir), successCb, null);

            } else {
                this._fileSpaceUsed += parseInt(
                    xml.childNodes[0].childNodes[i].getAttribute("bytesize"));
            }
        }
    },

    /**
     * Shows a dialog with a captcha code to unlock the account.
     */
    _runAuthPrompt: function nsA4F__runAuthPrompt() {
        var url = this._baseURL
            + "index.php?secure_token=" + this._secureToken
            + "&get_action=" + A4F_ACTION_GET_CAPTCHA;

        var windowMediator = Cc["@mozilla.org/appshell/window-mediator;1"]
                .getService(Ci.nsIWindowMediator);
        var window = windowMediator.getMostRecentWindow(null);

        var params = {
            inn: {
                captchaURL: url,
                username: this._username,
                status: this._loginStatus
            },
            out: null
        };

        window.openDialog(
            "chrome://ajaxplorer-for-filelink/content/authDialog.xhtml",
            "",
            "chrome, dialog, modal, resizable=yes",
            params).focus();

        if (params.out == null) {
            this._loginStatus = A4F_ABORT_LOGIN;
        } else {
            this._password = params.out.password;
            this._captchaCode = params.out.captchaCode;

            this._saveNewPassword();
        }

    },

    /**
     * Shows a dialog to select the repository where files will be uploaded.
     *
     * @param repositories  Custom array with all available repositories.
     */
    _runSelectRepositoryPrompt: function nsA4F__runAuthPrompt(repositories) {
        var windowMediator = Cc["@mozilla.org/appshell/window-mediator;1"]
                .getService(Ci.nsIWindowMediator);
        var window = windowMediator.getMostRecentWindow(null);

        var params = {
            inn: {
                rep: repositories
            },
            out: null
        };

        window.openDialog(
            "chrome://ajaxplorer-for-filelink/content/repoDialog.xhtml",
            "",
            "chrome, dialog, modal, resizable=yes",
            params).focus();

        if (params.out == null || params.out < 0) {
            this._runSelectRepositoryPrompt(repositories);
        } else {
            this._repositoryId = params.out;
            this._prefBranch.setCharPref("repositoryId", this._repositoryId);
        }

    },

    /**
     * Saves a new password for the current user using the Login Manager.
     */
    _saveNewPassword: function nsA4F__saveNewPassword() {
        var loginManager = Cc["@mozilla.org/login-manager;1"]
               .getService(Ci.nsILoginManager);

        var logins =
            loginManager.findLogins({}, this._baseURL, this._baseURL, null);

        var i = 0;
        while (i < logins.length && logins[i].hostname != this._baseURL) {
            i++;
        }


        if (i < logins.length) {
            login = logins[i].clone();
            login.password = this._password;
            loginManager.modifyLogin(logins[i], login);
        } else {
            var login = Cc["@mozilla.org/login-manager/loginInfo;1"]
                .createInstance(Components.interfaces.nsILoginInfo);

            login.init(this._baseURL, this._baseURL, null, this._username,
                this._password, "", "");
            loginManager.addLogin(login);
        }
    },

};

////////////////////////////////
// XPCOM factory registration //
////////////////////////////////

const NSGetFactory = XPCOMUtils.generateNSGetFactory([nsAjaXplorer]);


//////////////////////////
// nsAXPUploader Object //
//////////////////////////
const READY     = 0;
const UPLOADING = 1;
const UPLOADED  = 2;
const CANCELLED = 3;

function nsAXPUploader(username, password, aBaseURL, aFile, aCallback) {
    this.username = username;
    this.password = password;
    this.baseURL = aBaseURL;
    this.file = aFile;
    this.state = READY;
    this.requestObserver = aCallback;
}

nsAXPUploader.prototype = {
    username: null,
    password: null,
    baseURL: null,
    file: null,
    fileName: null,
    sharedFile: null,
    state: null,
    request: null,
    requestObserver: null,
    shareURL: null,


    /**
     * Cancels the upload request for the file associated with this uploader.
     */
    cancelFileUpload: function nsGFU_cancelFileupload() {
        if (this.state == READY || this.state == UPLOADING) {
            this.requestObserver.onStopRequest(null, null,
                    Ci.nsIMsgCloudFileProvider.uploadCanceled);

            if (this.request != null) {
                this.request.abort();
            }
        }

        this.state = CANCELLED;
        this.request = null;
    },

    /**
     * Deletes the file associated with this uploader.
     *
     * @param secureToken      Secure token to run the operation.
     * @param successCallback  Called if the file has been deleted
     *                         successfully.
     * @param failureCallback  Called back on error.
     */
    deleteFile: function nsGFU_deleteFile(secureToken, successCallback,
            failureCallback) {
        let url = this.baseURL
            + "index.php?secure_token=" + secureToken
            + "&get_action=" + A4F_ACTION_DELETE
            + "&dir=" + encodeURIComponent(A4F_DELETE_DIR)
            + "&file=" + encodeURIComponent(A4F_UPLOAD_DIR + this.fileName);

        let req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                .createInstance(Ci.nsIXMLHttpRequest);
        req.open("POST", url, true, this.username, this.password);

        req.onerror = function() {
            if (failureCallback != null) {
                failureCallback();
            }
        }.bind(this);

        req.onload = function() {
            if (successCallback != null) {
                successCallback();
            }
        }.bind(this);

        req.send();
    },

    /**
     * Deletes the shared link associated with this uploader.
     *
     * @param secureToken      Secure token to run the operation.
     * @param successCallback  Called if the shared link has been deleted
     *                         successfully.
     * @param failureCallback  Called back on error.
     */
    deleteSharedFile: function nsGFU_deleteSharedFile(secureToken,
            successCallback, failureCallback) {
        let url = this.baseURL
            + "index.php?secure_token=" + secureToken
            + "&get_action=" + A4F_ACTION_DELETE
            + "&ajxp_mime=shared_file"
            + "&dir=" + encodeURIComponent(A4F_SHARED_FILES_DIR)
            + "&file=" + encodeURIComponent(this.sharedFile);

        let req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                .createInstance(Ci.nsIXMLHttpRequest);
        req.open("POST", url, true, this.username, this.password);

        req.onerror = function() {
            if (failureCallback != null) {
                failureCallback();
            }
        }

        req.onload = function() {
            this.shareURL = "";
            this.sharedFile = "";

            if (successCallback != null) {
                successCallback();
            }
        }.bind(this);

        req.send();
    },

    /**
     * Finishes upload and forces server to copy files in the right place.
     *
     * @param secureToken      Secure token to run the operation.
     * @param successCallback  Called if the upload has been finished
     *                         successfully.
     * @param failureCallback  Called back on error.
     */
    finishUpload: function nsGFU_finishUpload(secureToken, successCallback,
            failureCallback) {
        let url = this.baseURL
            + "index.php?secure_token=" + secureToken
            + "&get_action=" + A4F_ACTION_NEXT_TO_REMOTE;

        let req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                .createInstance(Ci.nsIXMLHttpRequest);
        req.open("POST", url, true, this.username, this.password);

        req.onerror = function() {
            if (failureCallback != null) {
                failureCallback();
            }
        }.bind(this);

        req.onload = function() {
            let url = this.baseURL
            + "index.php?secure_token=" + secureToken
            + "&get_action=" + A4F_ACTION_TRIGGER_REMOTE_COPY;

            let req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                    .createInstance(Ci.nsIXMLHttpRequest);
            req.open("POST", url, true, this.username, this.password);

            req.onerror = function() {
                if (failureCallback != null) {
                    failureCallback();
                }
            }.bind(this);

            req.onload = function() {
                this.state = UPLOADED;

                let successCb = function() {
                    if (successCallback != null) {
                        successCallback();
                    }
                }.bind(this);

                this.urlForFile(secureToken, successCb, failureCallback);
            }.bind(this);

            req.send();
        }.bind(this);

        req.send();
    },

    /**
     * Starts the upload request for the file associated with this uploader.
     *
     * @param secureToken      Secure token to run the operation.
     * @param successCallback  Called if the upload has been completed
     *                         successfully.
     * @param failureCallback  Called back on error.
     */
    uploadFile: function nsGFU_uploadFile(secureToken, successCallback,
            failureCallback) {
        this.state = UPLOADING;
        let url = this.baseURL
            + "index.php?secure_token=" + secureToken
            + "&get_action=" + A4F_ACTION_UPLOAD
            + "&xhr_uploader=true"
            + "&dir=" + encodeURIComponent(A4F_UPLOAD_DIR);

        let req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
            .createInstance(Ci.nsIXMLHttpRequest);
        this.request = req;
        req.open("POST", url, true, this.username, this.password);

        req.onerror = function() {
            if (failureCallback != null) {
                failureCallback();
            }
        }.bind(this);

        req.onload = function() {
            this.finishUpload(secureToken, successCallback, failureCallback);
        }.bind(this);

        let curDate = Date.now().toString();
        req.setRequestHeader("Date", curDate);
        let boundary = "------" + curDate;
        let contentType = "multipart/form-data; boundary="+ boundary;
        req.setRequestHeader("Content-Type", contentType);

        let tosend = this._prepareFile(this._getTimeStamp(), boundary);
        req.send(tosend);
    },

    /**
     * Gets the sharing URL for the file associated with this uploader.
     *
     * @param secureToken      Needed secure token for the operation.
     * @param successCallback  Called if the url has been retrieved
     *                         successfully.
     * @param failureCallback  Called back on error.
     */
    urlForFile: function nsGFU_urlForFile(secureToken, successCallback,
            failureCallback) {
        let url = this.baseURL
            + "index.php?secure_token=" + secureToken
            + "&get_action=" + A4F_ACTION_SHARE
            + "&dir=" + encodeURIComponent(A4F_UPLOAD_DIR)
            + "&file=" + encodeURIComponent(A4F_UPLOAD_DIR) + this.fileName;
            //~ + "&expiration=" + A4F_EXPIRATION
            //~ + "&downloadlimit=" + A4F_DOWNLOAD_LIMIT;

        let req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                .createInstance(Ci.nsIXMLHttpRequest);
        req.open("POST", url, true, this.username, this.password);

        req.onerror = function() {
            this.shareURL = "";

            if (failureCallback != null) {
                failureCallback();
            }
        }.bind(this);

        req.onload = function() {
            this.shareURL = req.responseText;
            this.sharedFile = this.shareURL.substring(
                this.shareURL.lastIndexOf("/") + 1,
                    this.shareURL.indexOf(".php"));

            if (successCallback != null) {
                successCallback();
            }
        }.bind(this);

        req.send();
    },

    /**
     * Creates and returns a temporary file on the local file system.
     *
     * @param leafName  Original file name.
     */
    _getTempFile: function nsGFU__getTempFile(leafName) {
        let tempfile = Services.dirsvc.get("TmpD", Ci.nsIFile);
        tempfile.append(leafName)
        tempfile.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE,
                parseInt("0666", 8));

        // do whatever you need to the created file
        return tempfile.clone()
    },

    /**
     * Returns the current timestamp.
     *
     * @return  Current timestamp.
     */
    _getTimeStamp: function() {
        function pad(n){
            return n < 10 ? '0' + n : n
        }

        var date = new Date();

        return pad(date.getUTCFullYear())
            + pad(date.getUTCMonth() + 1)
            + pad(date.getUTCDate())
            + pad(date.getUTCHours())
            + pad(date.getUTCMinutes())
            + pad(date.getUTCSeconds());
    },

    /**
     * Prepares the file for uploading.
     *
     * @param timestamp  Timestamp to append to the file name.
     * @param boundary   Boundary used to wrap the file content.
     * @return           Stream based in the file to upload.
     */
    _prepareFile: function nsGFU__prepareFile(timestamp, boundary) {
        this.fileName = timestamp + "-" + this.file.leafName;

        let fileContents = "\r\n--" + boundary +
            "\r\nContent-Disposition: form-data; name=\"userfile_0\"; "
            + "filename=\"" + this._utf8_encode(this.fileName)
            + "\"\r\nContent-Type: application/octet-stream\r\n\r\n";

        let tempFile = this._getTempFile(this.fileName);
        let ostream = Cc["@mozilla.org/network/file-output-stream;1"]
                     .createInstance(Ci.nsIFileOutputStream);
        ostream.init(tempFile, -1, -1, 0);
        ostream.write(fileContents, fileContents.length);

        let fstream = Cc["@mozilla.org/network/file-input-stream;1"]
                       .createInstance(Ci.nsIFileInputStream);
        let sstream = Cc["@mozilla.org/scriptableinputstream;1"]
                       .createInstance(Ci.nsIScriptableInputStream);
        fstream.init(this.file, -1, 0, 0);
        sstream.init(fstream);

        // This blocks the UI which is less than ideal. But it's a local
        // file operations so probably not the end of the world.
        while (sstream.available() > 0) {
            let chunkSize = sstream.available();

            if (chunkSize > A4F_MAX_UPLOAD_CHUNK) {
                chunkSize = A4F_MAX_UPLOAD_CHUNK;
            }

            let bytes = sstream.readBytes(chunkSize);
            ostream.write(bytes, bytes.length);
        }

        fileContents = "\r\n--" + boundary + "--\r\n";
        ostream.write(fileContents, fileContents.length);

        ostream.close();
        fstream.close();
        sstream.close();

        // defeat fstat caching
        tempFile = tempFile.clone();
        fstream.init(tempFile, -1, 0, 0);
        fstream.close();
        // I don't trust re-using the old fstream.
        fstream = Cc["@mozilla.org/network/file-input-stream;1"]
                     .createInstance(Ci.nsIFileInputStream);
        fstream.init(tempFile, -1, 0, 0);
        let bufStream = Cc["@mozilla.org/network/buffered-input-stream;1"]
                        .createInstance(Ci.nsIBufferedInputStream);
        bufStream.init(fstream, tempFile.fileSize);
        // nsIXMLHttpRequest's nsIVariant handling requires that we QI
        // to nsIInputStream.
        return bufStream.QueryInterface(Ci.nsIInputStream);
    },

    /**
     * Returns a string encoded in utf-8 format.
     *
     * @param s  String to encode in utf-8 format.
     * @return   String in utf-8 format.
     */
    _utf8_encode: function(s) {
        for(var c, i = -1, l = (s = s.split("")).length,
            o = String.fromCharCode; ++i < l;
                s[i] = (c = s[i].charCodeAt(0)) >= 127
                    ? o(0xc0 | (c >>> 6)) + o(0x80 | (c & 0x3f))
                    : s[i]
        );

        return s.join("");
    },

    /**
     * Returns a decoded string from a string encoded in utf-8 format.
     *
     * @param s  String encoded in utf-8 format.
     * @return   Decoded string.
     *
     * @note     NOT USED.
     */
    _utf8_decode: function(s) {
        for(var a, b, i = -1, l = (s = s.split("")).length,
            o = String.fromCharCode, c = "charCodeAt"; ++i < l;
                ((a = s[i][c](0)) & 0x80)
                    && (s[i] = (a & 0xfc) == 0xc0
                    && ((b = s[i + 1][c](0)) & 0xc0) == 0x80
                        ? o(((a & 0x03) << 6) + (b & 0x3f))
                        : o(128), s[++i] = "")
        );

        return s.join("");
    },
};
