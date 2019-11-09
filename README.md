# Assignment 3 for CSC309H5 - Programming on the Web.

Try it out by downloading and following [setup](#setup-instructions) instructions below.

## Description

This is a NodeJS/WS backend + React/HTML/JS/CSS frontend. React controls what to render.

The website is called "Warehouse Wars - React".

### Technologies
  - Everything from [Assignment 2](https://github.com/serg06/csc309_website_2#technologies).
  - ReactJS for everything on frontend.
  - Websockets for making the Warehouse Wars game both multiplayer and harder to hack. (Non-WS version hosted game locally and sent scores afterwards.)
  - Canvas for Warehouse Wars game.

### Pages
  - **Game**: The Warehouse Wars game. Multiple worlds run on server. All actions are sent to server, all map updates are sent back and applied locally.
  - **User Profile**: Users can add some info about themselves.
  - **Results**: User high scores.
  - **Logout**: Now that's what I call a self-documenting feature.

### Other features:
  - Everything from [Assignment 2](https://github.com/serg06/csc309_website_2#other-features).
  - Functionality:
    - Code is written in react.
    - Only required things are rendered.
  - Game:
    - Game runs on backend to prevent easy simple score manipulation.
    - Game code almost identical to [Assignment 2](https://github.com/serg06/csc309_website_2)'s because it was so modular.
    - Drawn on canvas.
  - Websocket server:
    - JWT authentication with same token as web server.
    - Disconnect dead connections every 30 seconds.
    - Handles disconnected players gracefully.
    - Pages split across modular, re-usable components.
    - Use lifecycle events to connect/disconnect.

## Setup instructions
  - requires: npm and sqlite3, accessible from command line
  - run `./setup.sh`
  - - Note: if on Windows, make sure to run the npm command from a Windows terminal, NOT a WSL (Linux on Windows) one. (Node for WSL is ancient (v4), it doesn't support newer syntax.)
  - (optional) change `ww/static-content-react/lib/constants.js`
  - (recommended) change `ww/config.js`

## Run instructions
  - navigate to ww/
  - run game server in one terminal: `node gameserver_node.js`
  - - Note: If on Windows, make sure to run the command from a Windows terminal, NOT a WSL one.
  - run web server in another: `node ww_node.js`
  - navigate to `localhost:10600` in your browser (assuming you haven't changed constants.js)
