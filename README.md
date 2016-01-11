Pydio for Filelink
=======================

Description
-----------
*Pydio for Filelink* allows you to easily send file attachments by
uploading them to an storage service that uses
[Pydio](http://pydio.info/) as file management system.
Then, a public link to the file will be inserted into the body of the email.

The extension creates a folder called 'Thunderbird' in your default repository
where files will be uploaded. You can optionally limit the size of this folder
while configuring the Pydio account.

If your Pydio account is linked to one of the mail accounts configured in
Thunderbird, you can fastly configure the extension by selecting it in the
configuration settings. This way, if you change your password in Thunderbird,
*Pydio for Filelink* will automatically use the new one before asking
for a new password.

Requirements
------------
*Pydio for Filelink* works with Thunderbird 13.* or newer. The lastest
Thunderbird version can be found [here](http://www.mozilla.org/en-US/thunderbird/).

Installation
------------
You can install *Pydio for Filelink* using Thunderbird Add-ons Manager
(Tools->Addons).

To perform a manually installation or install older versions, you can download
the extension from
[Thunderbird Add-ons](https://addons.mozilla.org/en-US/thunderbird/addon/pydio-for-filelink/)
and open it with Thunderbird Add-ons Manager.


Notes
-----

**HTTPS/SSL**

If you have problems to use *Pydio for Filelink* with Pydio providers
over HTTPS/SSL, maybe you have to add the certificate to Thunderbird exceptions
(Edit->Preferences->Advanced->Certificates->View certificates->Add exception...).

**Authentication System**

*Pydio for Filelink* works with Pydio Providers that use
authentication systems based on basic access authentication.
