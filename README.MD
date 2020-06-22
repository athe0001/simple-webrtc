# simple-webrtc

A simple WebRTC implementation in Javascript.
It allows two users who connect with each other to discuss via text messages and video call.

It is a simple implementation to understand how WebRTC works.

Most of the code is copied from: https://www.tutorialspoint.com/webrtc/index.htm
But it has been updated to include both text and video at the same time.
I also replaced deprecated methods.
## Getting started
### Installation
* Install Node.js and npm
* Install the static web server for Node.js: `npm install -g node-static`
* Install needed dependencies:
	* `npm install ws`
	* `npm install fs`
	* `npm install https`
	* `npm install http-server`
	* In the `textchat` folder, `npm install bootstrap`
* Generate a `key.pem` and `cert.pem` for both the server and the client (you need to have openssl installed):
	* `openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem`
	* Make sure you have a `key.pem` and `cert.pem` in both `server` and `textchat` folders
### Running the server and the client
#### Server
* `cd server`
* `node server.js`
#### Client
* `cd textchat`
* `http-server -S -C cert.pem`
### How to use it
#### Giving rights
You can access the app by navigating to https://localhost:8080. 
If you generated the SSL certificates with the above command, you will most likely get a warning on your browser. If you are using Chrome, type `thisisunsafe` to access the website.

You will also need to navigate to https://localhost:9000 and also type `thisisunsafe`. This is necessary because the application needs to communicate with the websocket server via a secured connection. Please note that this page won't load, so as soon as you got through the warning, you can close the tab.
#### Use
Once you the page has loaded, type your desired username and click on the `Login` button.
Open another tab, and login with another username.

Then, in one tab, type the username of the other tab and click on the `Connect` button. If you authorized your browser to access your camera, you should see two video feeds. You can also chat via text messages.

## Known bugs
* If you hang, you cannot connect to anyone anymore. You will need to relogin (start from the first page) again.
* Sometimes, the websocket server crashes when trying to login.

## Why do you need to run the application over HTTPS?
For security reasons, browsers do not allow a website to access the camera/microphone of a user if the website is not accessed over HTTPS.
