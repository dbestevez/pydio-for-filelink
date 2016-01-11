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

var EXPORTED_SYMBOLS = [
                        
                        "A4F_URL_ICON",
                        "A4F_URL_SETTINGS",
                        "A4F_URL_MANAGEMENT",

                        "A4F_ACTION_DELETE",
                        "A4F_ACTION_GET_CAPTCHA",
                        "A4F_ACTION_GET_SECURE_TOKEN",
                        "A4F_ACTION_GET_LOGIN_SEED",
                        "A4F_ACTION_GET_XML_REGISTRY",
                        "A4F_ACTION_LS",
                        "A4F_ACTION_LOGIN",
                        "A4F_ACTION_MKDIR",
                        "A4F_ACTION_NEXT_TO_REMOTE",
                        "A4F_ACTION_SHARE",
                        "A4F_ACTION_SWITCH_REPOSITORY",
                        "A4F_ACTION_TRIGGER_REMOTE_COPY",
                        "A4F_ACTION_UPLOAD",

                        "A4F_LOG_OK",
                        "A4F_WRONG_USER",
                        "A4F_ACCOUNT_LOCKED",
                        "A4F_ABORT_LOGIN",

                        "A4F_MAX_UPLOAD_CHUNK",

                        "A4F_DEFAULT_REPOSITORY",
                        "A4F_SHARED_FILES_REPOSITORY",
                        
                        "A4F_UPLOAD_MAX_SIZE",

                        "A4F_ROOT_DIR",
                        "A4F_SHARED_FILES_DIR",
                        "A4F_UPLOAD_DIR",
                        "A4F_DELETE_DIR",
                        "A4F_UPLOAD_DIR_NAME",

                        "A4F_EXPIRATION",
                        "A4F_DOWNLOAD_LIMIT",
                        
                        ];


// URLs
const A4F_URL_ICON       = "chrome://ajaxplorer-for-filelink/skin/icon.png";
const A4F_URL_SETTINGS   = "chrome://ajaxplorer-for-filelink/content/settings.xhtml";
const A4F_URL_MANAGEMENT = "chrome://ajaxplorer-for-filelink/content/management.xhtml";

// Actions
const A4F_ACTION_DELETE              = "delete";
const A4F_ACTION_GET_SECURE_TOKEN    = "get_secure_token";
const A4F_ACTION_GET_LOGIN_SEED      = "get_seed";
const A4F_ACTION_GET_XML_REGISTRY    = "get_xml_registry";
const A4F_ACTION_GET_CAPTCHA         = "get_captcha";
const A4F_ACTION_LOGIN               = "login";
const A4F_ACTION_LS                  = "ls";
const A4F_ACTION_MKDIR               = "mkdir";
const A4F_ACTION_NEXT_TO_REMOTE      = "next_to_remote";
const A4F_ACTION_SHARE               = "share";
const A4F_ACTION_SWITCH_REPOSITORY   = "switch_repository";
const A4F_ACTION_TRIGGER_REMOTE_COPY = "trigger_remote_copy";
const A4F_ACTION_UPLOAD              = "upload";

// Login results
const A4F_LOG_OK         = 1;
const A4F_WRONG_USER     = -1;
const A4F_ACCOUNT_LOCKED = -4;
const A4F_ABORT_LOGIN    = 999;

// Max upload chunk (4 Mb)
const A4F_MAX_UPLOAD_CHUNK = 4 * 1024 * 1024;

// Repository id by default
const A4F_DEFAULT_REPOSITORY = 0;

// Repository id for shared files
const A4F_SHARED_FILES_REPOSITORY = "ajxp_shared";

// Upload max filesize property
const A4F_UPLOAD_MAX_SIZE = "UPLOAD_MAX_SIZE";

// Account folders
const A4F_ROOT_DIR         = "/";
const A4F_SHARED_FILES_DIR = "/files";
const A4F_UPLOAD_DIR       = "/Thunderbird/";
const A4F_DELETE_DIR       = "/Thunderbird";
const A4F_UPLOAD_DIR_NAME  = "Thunderbird";

// Link expiration (in days)
const A4F_EXPIRATION     = 10;

// Number of allowed downloads
const A4F_DOWNLOAD_LIMIT = 10;
