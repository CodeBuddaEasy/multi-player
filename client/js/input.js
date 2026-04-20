// Define keyboard inputs
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
    Space: false
}

// Add event listeners for keyboard inputs
document.addEventListener('keydown', (e) => {
    console.log("Brauser püüdis kinni nupu! kood:", e.code, "| väärtus:", e.key);

    if (keys.hasOwnProperty(e.code)) {

        //Prevent default browser actions for certain keys
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
            e.preventDefault();
        }

        //Send input to server if it's a new key press
        if (!keys[e.code]) {
            keys[e.code] = true;
            sendInputToServer(e.code);
        }
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

function sendInputToServer(key) {
    console.log(`Sending input to server: ${key}`);

    if (typeof socket !== 'undefined') {
        if (key === 'Space') {
            socket.emit('PLACE_BOMB');
        } else {
            socket.emit('PLAYER_MOVE', { key: key });
        }
    }
}
