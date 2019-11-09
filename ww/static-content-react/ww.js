// map keys to directions for moving with keyboard
const key_to_direction = {
    81: 'nw',
    87: 'n',
    69: 'ne',
    65: 'w',
    68: 'e',
    90: 'sw',
    88: 's',
    67: 'se'
};

// initial state
const initialState = {
    ws: undefined,
    authenticated: undefined,
    board: undefined,
    worlds: undefined,
    world: undefined,
    lastGameStatus: undefined
};

class GameSection extends React.Component {
    constructor(props) {
        super(props);
        this.state = initialState;
        this.connectWs = this.connectWs.bind(this);
        this.chooseWorld = this.chooseWorld.bind(this);
        this.move = this.move.bind(this);
        this.keyPressed = this.keyPressed.bind(this);
        this.getImgRef = this.getImgRef.bind(this);
        this.redrawBoard = this.redrawBoard.bind(this);
    }

    render() {
        // if not yet authenticated
        if (this.state.authenticated === undefined) {
            return <div id="game" className="section">Connecting to WS and authenticating...</div>
        } else if (this.state.authenticated === false) {
            return <div id="game" className="section">Authentication failed!</div>
        }

        // if worlds are not loaded yet
        if (this.state.worlds === undefined) {
            return <div id="game" className="section">Loading worlds...</div>
        }

        // if world has not been chosen
        if (this.state.world === undefined) {
            let header;

            switch (this.state.lastGameStatus) {
                case 'won':
                    header = <h3>Congratulations, you won! Choose a world to play again.</h3>;
                    break;
                case 'lost':
                    header = <h3>You lost! Choose a world to try again.</h3>;
                    break;
                default:
                    header = <h3>Choose a world to start playing!</h3>;
            }

            return (
                <div id="game" className="section">
                    {header}
                    {this.state.worlds.map((world, i) => {
                        return (
                            <div key={i}>
                                <button onClick={() => {
                                    console.log(`choose world ${i}`);
                                    this.chooseWorld(i);
                                }}>
                                    World {i} ({world.player_count}/{world.player_limit})
                                </button>
                                <br/>
                                <br/>
                            </div>
                        );
                    })}
                </div>
            )
        }

        // if board has not loaded
        if (this.state.board === undefined) {
            return <div id="game" className="section">Loading board...</div>
        }

        // draw board first time a bit faster
        if (!this.refs.canvas) {
            setTimeout(this.redrawBoard, 50);
        }

        let canvasBoard = (
            <td id="stage">
                <canvas ref="canvas" width="480" height="480" style={{border: '1px solid #d3d3d3'}}>You can't
                    see this because your browser doesn't support canvas.
                </canvas>
            </td>
        );

        let legendAndControls = (
            <td>
                <center>
                    <h2>Legend</h2>
                    <table className="legend">
                        <tbody>
                        <tr>
                            <td><img ref="blankImg" src="icons/blank.gif" id="blankImage"/></td>
                            <td><img ref="boxImg" src="icons/emblem-package-2-24.png" id="boxImage"/></td>
                            <td><img ref="playerImg" src="icons/face-cool-24.png" id="playerImage"/></td>
                            <td><img ref="monsterImg" src="icons/face-devil-grin-24.png" id="monsterImage"/></td>
                            <td><img ref="blueMonsterImg" src="icons/devil-blue.png" id="blueMonsterImage"/></td>
                            <td><img ref="wallImg" src="icons/wall.jpeg" id="wallImage"/></td>
                        </tr>
                        <tr>
                            <td> Empty <br/> Square</td>
                            <td> Box</td>
                            <td> Player</td>
                            <td> Monster</td>
                            <td> Smart Monster</td>
                            <td> Wall</td>
                        </tr>
                        </tbody>
                    </table>
                    <h2>Controls</h2>
                    <table className="controls">
                        <tbody>
                        <tr>
                            <td><img src="icons/north_west.svg" onClick={() => this.move('nw')}/></td>
                            <td><img src="icons/north.svg" onClick={() => this.move('n')}/></td>
                            <td><img src="icons/north_east.svg" onClick={() => this.move('ne')}/></td>
                        </tr>
                        <tr>
                            <td><img src="icons/west.svg" onClick={() => this.move('w')}/></td>
                            <td>&nbsp;</td>
                            <td><img src="icons/east.svg" onClick={() => this.move('e')}/></td>
                        </tr>
                        <tr>
                            <td><img src="icons/south_west.svg" onClick={() => this.move('sw')}/></td>
                            <td><img src="icons/south.svg" onClick={() => this.move('s')}/></td>
                            <td><img src="icons/south_east.svg" onClick={() => this.move('se')}/></td>
                        </tr>
                        </tbody>
                    </table>
                </center>
            </td>
        );

        return (
            <table id="game" className="section" style={{tableLayout: 'fixed'}}>
                <tbody>
                <tr>
                    {canvasBoard}
                    {legendAndControls}
                </tr>
                </tbody>
            </table>
        );
    }

    componentDidMount() {
        // connect to game server
        this.connectWs();

        // add keypress listener
        document.addEventListener('keydown', this.keyPressed);
    }

    componentWillUpdate() {
        console.log('component update');
        this.redrawBoard();
    }

    redrawBoard() {
        // draw canvas
        if (this.state.board && this.refs.canvas) {
            console.log('get canvas context');
            let ctx = this.refs.canvas.getContext("2d");

            console.log('draw images!');
            this.state.board.map((row, y) => {
                row.map((actorName, x) => {
                    ctx.drawImage(this.getImgRef('blank'), x * 24, y * 24);
                    ctx.drawImage(this.getImgRef(actorName), x * 24, y * 24);
                })
            })
        }
    }

    keyPressed(event) {
        let direction = key_to_direction[event.keyCode];
        if (direction !== undefined) {
            this.move(direction);
        }
    }

    componentWillUnmount() {
        // close connection to game server
        if (this.state.ws) {
            this.state.ws.close();
        }

        // reset state
        this.setState(initialState);

        // remove keypress listener
        document.removeEventListener('keydown', this.keyPressed)
    }

    // connect to game server
    connectWs() {
        let ws = new WebSocket(global.wwWsURL);
        ws.onopen = (event) => {
            console.log('ws successfully opened!');
            this.setState({ws: ws});
            ws.send(JSON.stringify({msg: 'authenticate', token: this.props.token}))
        };
        ws.onerror = (event) => {
            console.log(`ws error when connecting: ${JSON.stringify(event)}`);
        };
        ws.onclose = (event) => {
            console.log(`ws closed. code: ${event.code}; reason: ${event.reason}; wasClean: ${event.wasClean}.`);
        };
        ws.onmessage = (event) => {
            console.log(`ws received message: ${event.data}`);
            let message = JSON.parse(event.data);
            switch (message.msg) {
                case 'authenticated':
                    console.log('setting worlds...');
                    this.setState({authenticated: true});
                    break;
                case 'authentication_error':
                case 'unauthenticated':
                    console.log('could not authenticate!');
                    this.setState({authenticated: false});
                    break;
                case 'worlds':
                    console.log('setting worlds...');
                    this.setState({worlds: message.worlds});
                    break;
                case 'board':
                    console.log('setting board...');
                    this.setState({board: message.board});
                    break;
                case 'update':
                    console.log('updating board...');
                    switch (message.status) {
                        case 'playing':
                            this.setState((prevState) => {
                                let board = prevState.board.slice();
                                for (let [[y, x], newName] of message.updates) {
                                    board[y][x] = newName;
                                }
                                return {board: board};
                            });
                            break;
                        case 'won':
                            this.setState({
                                world: undefined,
                                board: undefined,
                                lastGameStatus: 'won'
                            });
                            break;
                        case 'lost':
                            this.setState({
                                world: undefined,
                                board: undefined,
                                lastGameStatus: 'lost'
                            });
                            break;
                        default:
                            break;
                    }
                    break;
                default:
                    console.log(`unknown msg ${message.msg}`);
                    break;
            }
        };
    }

    chooseWorld(i) {
        this.setState({world: i, board: undefined});
        this.state.ws.send(JSON.stringify({msg: 'leave_world'}));
        this.state.ws.send(JSON.stringify({msg: 'choose_world', world: i}));
    }

    move(direction) {
        this.state.ws.send(JSON.stringify({msg: 'move', direction}));
    }

    getImgRef(actorType) {
        switch (actorType) {
            case 'blank':
                return this.refs.blankImg;
            case 'box':
                return this.refs.boxImg;
            case 'player':
                return this.refs.playerImg;
            case 'monster':
                return this.refs.monsterImg;
            case 'blueMonster':
                return this.refs.blueMonsterImg;
            case 'wall':
                return this.refs.wallImg;
            default:
                console.log(`error: unknown actorType ${actorType}`);
                break;
        }
    }
}

