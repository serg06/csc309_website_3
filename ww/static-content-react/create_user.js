class CreateUserSection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            buttonMsg: 'Create User',
            id: '',
            password: '',
            name: ''
        };
        this.onClickLogin = this.props.onClickLogin;
        this.handleChange = this.handleChange.bind(this);
        this.onClickRegister = this.onClickRegister.bind(this);
    }

    render() {
        return (
            <div id="create_user" className="section" style={{tableLayout: 'fixed'}}>
                <form id="createUserForm" onSubmit={this.onClickRegister}>
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
                            <th><label>Name</label></th>
                            <td><input type="text" name="name" pattern="[a-zA-Z0-9]+"
                                       title="only alphanumeric characters are allowed" required
                                       value={this.state.name}
                                       onChange={this.handleChange}/></td>
                        </tr>
                        <tr>
                            <th></th>
                            <td>
                                <input type="submit" value={this.state.buttonMsg}/>
                            </td>
                        </tr>
                        <tr id="createUserErrors" style={{display: 'none'}}>
                            <th>Errors</th>
                            <td></td>
                        </tr>
                        </tbody>
                    </table>
                </form>
                <br/>
                <button
                    onClick={this.onClickLogin}>
                    Or go back to login...
                </button>
            </div>
        );
    }

    // create user from values filled in on create_user page
    onClickRegister(e) {
        e.preventDefault();
        let user = this.state.id;
        let password = this.state.password;
        let name = this.state.name;
        console.log(`creating user [${user} | ${password} | ${name}]`);

        $.ajax({
            method: "POST",
            url: "/api/create_user/",
            data: {id: user, password: password, name: name}
        }).done((data, text_status, jqXHR) => {
            // success
            console.log('Create user success!');
            this.setState({buttonMsg: 'Create user success!'});
        }).fail(function (err) {
            console.log('Create user failed!');
        });
    }

    // Record input change
    handleChange(e) {
        this.setState({[e.target.name]: e.target.value});
        console.log(`LoginSection set state to ${JSON.stringify(this.state)}`);
    }
}
