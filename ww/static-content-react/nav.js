class NavSection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {selected: 'game'};
        this.onLogout = this.props.onLogout;
        this.onClickLogout = this.onClickLogout.bind(this);
        this.switchView = (e) => {
            this.props.setView(e.target.name);
            this.setState({selected: e.target.name});
        };
    }

    render() {
        return (
            <nav>
                <ul>
                    {[['game', 'Game'], ['user_profile', 'User Profile'], ['high_scores', 'High Scores']].map(([name, title]) => {
                        // Fill in navigation options
                        return (
                            <li key={name}>
                                <button name={name}
                                        className={name === this.state.selected ? 'selected' : ''}
                                        onClick={this.switchView}>{title}
                                </button>
                            </li>
                        );
                    })}
                    <li>
                        <button name="logout" onClick={this.onClickLogout}>Logout</button>
                    </li>
                </ul>
            </nav>
        );
    }

    onClickLogout() {
        $.ajax({
            method: "POST",
            url: "/api/logout/"
        }).done((data, text_status, jqXHR) => {
            console.log('logout successfully');
            this.onLogout();
            window.location.href = '/';
        }).fail((err) => {
            this.onLogout();
            window.location.href = '/';
        });
    }
}
