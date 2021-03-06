import React from 'react';
import { ListItem } from 'material-ui/List';
import Checkbox from 'material-ui/Checkbox';
import axios from 'axios';

class Invitees extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      confirmed: this.props.invitee.confirmed
    };
    this.handleUserCheck = this.handleUserCheck.bind(this);
  }

  handleUserCheck() {

    let user = this.props.user;
    let trip = this.props.trip;
    axios.post('/confirmed/update', {
      user: user,
      trip: trip
    })
      .then((toggled) => {
        //reset your own state
        this.setState({
          confirmed: toggled.data
        });
        //emit to update other users' views
        this.props.socket.emit('clientConfirmation', {
          user: user,
          trip: trip,
          confirmed: toggled.data
        });
      })
      .catch((err) => {
        console.log(err);
      });
  }



  render() {
    let checkBox;
    if (this.props.user.email === this.props.invitee.email) {
      checkBox = <Checkbox defaultChecked={this.state.confirmed} onCheck={this.handleUserCheck}/>;
    } else {
      checkBox = <Checkbox defaultChecked={this.state.confirmed}/>;
    }

    return (
      <div>
        <ListItem
          leftCheckbox={checkBox}
          primaryText={this.props.invitee.email}/>
      </div>
    );
  }
}

export default Invitees;
