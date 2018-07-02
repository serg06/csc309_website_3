class HighScoresSection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {loaded: false, highscores: []};
        this.updateScores = this.updateScores.bind(this);
    }

    render() {
        // if highscores not yet loaded, return loading icon
        if (!this.state.loaded) {
            return (
                <div id="high_scores" className="section">
                    <h3>High scores</h3>
                    <div id="high_scores_section">
                        <img src="icons/loading.gif"/>
                    </div>
                </div>
            );
        }

        // render highscores
        return (
            <div id="high_scores" className="section">
                <h3>High scores</h3>
                <table>
                    <tbody>
                    <tr>
                        <th></th>
                        <th>Name</th>
                        <th>Score</th>
                    </tr>
                    {this.state.highscores.map((score, i) => {
                        return (
                            <tr key={i + 1}>
                                <th>{i + 1}</th>
                                <td>{score.id}</td>
                                <td>{score.score}</td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
        );
    }

    componentDidMount() {
        this.updateScores();
    }

    updateScores() {
        $.ajax({
            method: "GET",
            url: "/api/high_scores/"
        }).done((data, text_status, jqXHR) => {
            // success
            while (data.scores.length < 10) {
                data.scores.push({'id': '', 'score': ''});
            }

            this.setState({
                loaded: true,
                highscores: data.scores
            });

            console.log('fetched scores successfully!');
        }).fail(function (err) {
            console.log('failed to fetch scores!');
        });
    }
}
