# Reddit Adblock Security Demo
This is the code for our Reddit Adblock from our 428 final presentation.

## Install
### Prerequisites
- Install Node.JS Here: https://nodejs.org/en
- Clone project to desired location
### Server Setup
- Open project with any code editor (Highly recommend VSCode: https://code.visualstudio.com/)
- In terminal, Enter `npm install`
- Navigate disk to `Reddit-Adblock-Security-Demo/server`
- Start server in terminal with `node server.js`
- (To close server, hit `CTRL_C` in terminal)
### Extension Setup
- Open chrome and input `chrome://extensions/` into URL (Or navigate to manage extensions)
- Check `Developer mode` at the top right
- Press `Load unpacked` and select project folder
- Extension should now be added
- For additional use, you can hit `details` on extension and `Pin to toolbar` to view extension at the top
### Testing
- With server running, start navigate to `reddit.com`
- In server terminal, you should see keylogging information
- There you can open console
- You can see what is being sent to server and server response
