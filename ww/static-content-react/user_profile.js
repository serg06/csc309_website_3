
class UserProfileSection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            updating: false,

            // unmodifiable fields
            id: '',
            score: '',

            // modifiable fields
            password: '',
            name: ''
        };
        this.handleChange = this.handleChange.bind(this);
        this.loadUserProfile = this.loadUserProfile.bind(this);
        this.onClickLogin = this.onClickLogin.bind(this);
        this.onClickUpdate = this.onClickUpdate.bind(this);
        this.onClickDelete = this.onClickDelete.bind(this);
    }

    render() {
        return (
            <div id="user_profile" className="section">
                <form id="user_profile_form" onSubmit={this.onClickUpdate}>
                    <table>
                        <tbody>
                        <tr>
                            <th><label>User</label></th>
                            <td><input type="text" name="id" value={this.state.id} disabled/></td>
                        </tr>
                        <tr>
                            <th><label>Score</label></th>
                            <td><input type="text" name="score" value={this.state.score} disabled/></td>
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
                            <td>{this.state.updating ? <img src="icons/loading.gif" name="loading"/> : ''}</td>
                            <td>
                                <input type="submit" value="Update"/>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </form>
                <button onClick={this.onClickDelete} style={{color: 'red'}}>DELETE USER</button>
            </div>
        );
    }

    componentDidMount() {
        this.loadUserProfile();
    }


    // Record input change
    handleChange(e) {
        this.setState({[e.target.name]: e.target.value});
        console.log(`UserProfileSection set state to ${JSON.stringify(this.state)}`);
    }

    // Reload user profile section (asynchronously)
    loadUserProfile() {
        $.ajax({
            method: "GET",
            url: "/api/user/"
        }).done((data, text_status, jqXHR) => {
            // success
            console.log('successfully loaded user profile!');
            let user = data.user;

            this.setState({
                id: user.id,
                score: user.score,
                name: user.name
            });

        }).fail(function (err) {
            console.log('failed to load user profile...');
        });
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

    // update user from values filled in on user_profile view
    onClickUpdate(e) {
        e.preventDefault();

        // get modifiable fields
        let password = this.state.password;
        let name = this.state.name;

        this.setState({updating: true});

        console.log(`updating user with ${JSON.stringify({user: {password: password, name: name}})}`);

        // send it off
        $.ajax({
            method: "POST",
            url: "/api/update_user/",
            data: {user: {password: password, name: name}}
        }).always(() => {
            console.log('finished updating user');
            this.setState({updating: false});

        }).fail(function (err) {
            console.log('failed to update user...');
        });
    }

    // delete user! Permanently!!
    onClickDelete(e) {
        e.preventDefault();

        // send it off
        $.ajax({
            method: "DELETE",
            url: "/api/delete_user/"
        }).done(() => {
            // success
            console.log('successfully deleted user!');
            window.location.href = '/';
        }).fail(() => {
            console.log('failed to delete user...');
        });
    }
}
