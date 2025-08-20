// This script runs in the offscreen document.
// Its sole purpose is to create an iframe that loads the Seesaw app.

const iframe = document.createElement('iframe');
iframe.src = 'https://app.seesaw.me/';
document.body.appendChild(iframe);
