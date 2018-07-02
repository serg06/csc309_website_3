class LoginSection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {id: '', password: ''};
        this.onClickRegister = this.props.onClickRegister;
        this.onLogin = this.props.onLogin;
        this.handleChange = this.handleChange.bind(this);
        this.onClickLogin = this.onClickLogin.bind(this);
    }

    render() {
        return (
            <div id="login" className="section">
                <form id="loginForm" onSubmit={this.onClickLogin}>
                    <table>
                        <tbody>
                        <tr>
                            <th><label>User</label></th>
                            <td><input type="text" name="id" pattern="[a-zA-Z0-9]+"
                                       title="only alphanumeric characters are allowed" required
                                       value={this.state.id}
                                       onChange={this.handleChange}/></td>
                        </tr>
                        <tr>
                            <th><label>Password</label></th>
                            <td><input type="password" name="password" required
                                       value={this.state.password}
                                       onChange={this.handleChange}/></td>
                        </tr>
                        <tr>
                            <th></th>
                            <td>
                                <input type="submit" value="Login"/>
                            </td>
                        </tr>
                        <tr id="loginErrors" style={{display: 'none'}}>
                            <th>Errors</th>
                            <td></td>
                        </tr>
                        </tbody>
                    </table>
                </form>
                <br/>
                <button
                    onClick={this.onClickRegister}>
                    Or go to register...
                </button>
            </div>
        );
    }

    onClickLogin(e) {
        e.preventDefault();
        let user = this.state.id;
        let password = this.state.password;
        console.log(`logging in with [${user}:${password}]`);

        $.ajax({
            method: "POST",
            url: "/api/login/",
            data: {'id': user, 'password': password}
        }).done((data, text_status, jqXHR) => {
            // success
            console.log('Login success!');
            this.onLogin(data.token);
        }).fail(function (err) {
            console.log('Login failed!');
        });
    }

    // Record input change
    handleChange(e) {
        this.setState({[e.target.name]: e.target.value});
        console.log(`LoginSection set state to ${JSON.stringify(this.state)}`);
    }
}
