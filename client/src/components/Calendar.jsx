import React from 'react';
import BigCalendar from 'react-big-calendar';
import moment from 'moment';
import axios from 'axios';

import 'react-big-calendar/lib/css/react-big-calendar.css';

// Setup the localizer by providing the moment (or globalize) Object
// to the correct localizer.
BigCalendar.momentLocalizer(moment); // or globalizeLocalizer

class Calendar extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      user: this.props.currentUser,
      trip: this.props.trip,
      availability: [{
        title: this.props.trip.tripname,
        start: this.props.trip.rangeStart,
        end: this.props.trip.rangeEnd,
      }],
      overlapAvailabilities: [],
      addingMultipleAvailability: false
    };

    this.pickDate = this.pickDate.bind(this);
    this.compareToSelectDates = this.compareToSelectDates.bind(this);
    this.sortArraysInProperty = this.sortArraysInProperty.bind(this);
    this.compareDates = this.compareDates.bind(this);
    this.compareDateStrings = this.compareDateStrings.bind(this);
    this.checkForConnectedAvailability = this.checkForConnectedAvailability.bind(this);
    this.turnAvailabilityToOjb = this.turnAvailabilityToOjb.bind(this);
    this.addAvailabilityByRange = this.addAvailabilityByRange.bind(this);
    this.deleteMultipleDates = this.deleteMultipleDates.bind(this);
    this.connectSingleAvailability = this.connectSingleAvailability.bind(this);
    this.connectMultipleAvailability = this.connectMultipleAvailability.bind(this);
    this.currentDateIsSingle = this.currentDateIsSingle.bind(this);
    this.subscribeToNewAvailability = this.subscribeToNewAvailability.bind(this);
    this.getAllAvailability = this.getAllAvailability.bind(this);
    this.subscribeToDeletedAvailability = this.subscribeToDeletedAvailability.bind(this);
    this.subscribeToMultipleAvailabilityDelete = this.subscribeToMultipleAvailabilityDelete.bind(this);
  }

  getAllAvailability() {
    let currentAvailability = this.state.availability;
    axios.get('/availability/byTripId')
      .then((availabilities)=>{
        let storedAvailability = availabilities.data.map((avail) => {
          let users = this.props.allUsers;
          let name;
          for (var i = 0; i < users.length; i++) {
            if (users[i].id === avail.user_id) {
              name = users[i].display;
            }
          }
          return {
            'id': avail.id,
            'title': name,
            'start': avail.rangeStart,
            'end': avail.rangeEnd
          };
        });
        currentAvailability = currentAvailability.concat(storedAvailability);
        this.setState({
          availability: currentAvailability
        }, () => {
          this.setState({overlapAvailabilities: this.compareToSelectDates()});
        });        
      })
      .catch((err) => {
        console.log(err);
      });
  }

  componentDidMount() {
    this.getAllAvailability();
    this.subscribeToNewAvailability();
    this.subscribeToDeletedAvailability();
    this.subscribeToMultipleAvailabilityDelete();
  }

  subscribeToNewAvailability() {
    this.props.socket.on('serverAvailabilityAdd', (data) => {
      let stateAvailability = this.state.availability;
      stateAvailability.push(data);
      this.setState({
        availability: stateAvailability
      }, () => {
        if (this.state.addingMultipleAvailability) {
        } else {
          this.checkForConnectedAvailability();
        }      
        this.setState({overlapAvailabilities: this.compareToSelectDates()});
      });
    });
  }

  subscribeToDeletedAvailability() {
    this.props.socket.on('serverAvailabilityDelete', (data) => {
      let stateAvailability = this.state.availability;
      for (var i = 0; i < stateAvailability.length; i++) {
        if (stateAvailability[i].id === data) {
          stateAvailability.splice(i, 1);
        }
      }
      this.setState({
        availability: stateAvailability
      }, () => {
      }, ()=>{
        // this state is relying on availability state changes
        this.setState({overlapAvailabilities: this.compareToSelectDates()}); 
      });
    });
  }

  subscribeToMultipleAvailabilityDelete() {
    this.props.socket.on('serverAvailabilityMultipleDelete', (idArray) => {
      let stateAvailability = this.state.availability;
      idArray.sort();
      for (var i = 0; i < stateAvailability.length; i++) {
        for (var j = 0; j < idArray.length; j++) {
          if (stateAvailability[i].id === idArray[j]) {
            stateAvailability.splice(i, 1);
          }
        }
      }
      this.setState({
        availability: stateAvailability
      }, ()=>{
        this.setState({overlapAvailabilities: this.compareToSelectDates()}); // this state is relying on availability state changes
      });
    });
  }

  turnAvailabilityToOjb() {
    var avails = this.state.availability;
    var availsObj = {};
    var selected = {};
    avails.forEach(avail=>{ // this will collect all avails and organize by username
      var check = false;
      if (avail.id) {
        if (availsObj[avail.title] === undefined ) {
          availsObj[avail.title] = [];
        }
        availsObj[avail.title].push({id: avail.id, title: avail.title, start: avail.start, end: avail.end });

      }
    });

    this.sortArraysInProperty(availsObj, this.compareDates);
    return availsObj;
  }

  compareToSelectDates() {
    var availsObj = this.turnAvailabilityToOjb();
    var list = [];
    var first = true;
    for (var x in availsObj) {
      if (first) {
        list = availsObj[x];
        first = false;
      }
      var tempList = [];
      for (var i = 0; i < availsObj[x].length; i++) {
        tempList = tempList.concat(this.compareWithSelectedList(list, availsObj[x][i], x, i));
      }
      if (tempList.length === 0) {
        return [];
      }
      list = tempList;

    }
    return list;
    

  }

  compareWithSelectedList(notelist, avail) { // takes notelist(multiple overlaps) and find overlap for current availability passed in as second argument
    var result = [];
    notelist.forEach(noted => {  
      if (this.compareDateStrings(noted.start, avail.start) <= 0 && this.compareDateStrings(noted.end, avail.end) >= 0) {
        result.push(avail);
      } else if (this.compareDateStrings(noted.start, avail.start) >= 0 && this.compareDateStrings(noted.end, avail.end) <= 0) {
        result.push(noted);
      } else if (this.compareDateStrings(noted.start, avail.start) <= 0 && this.compareDateStrings(noted.end, avail.end) <= 0) {
        var obj = {start: avail.start, end: noted.end};
        if (this.compareDateStrings(obj.start, obj.end) <= 0) {
          result.push(obj);
        }        
      } else if (this.compareDateStrings(noted.start, avail.start) >= 0 && this.compareDateStrings(noted.end, avail.end) >= 0) {
        var obj = {start: noted.start, end: avail.end};
        if (this.compareDateStrings(obj.start, obj.end) <= 0) {
          result.push(obj);
        }       
      } 
    });
    return result;
  }

  sortArraysInProperty(obj, filter) { // filter to be used for comapring distinct date ranges
    for (var x in obj) {
      obj[x].sort(filter);
    }
  }

  compareDates(first, second) { // this function determines whether the first date is earlier than second
    var date1 = first.start;
    var date2 = second.start;

    if (typeof date1 === 'string') {
      date1 = new Date(date1);
    }
    if (typeof date2 === 'string') {
      date2 = new Date(date2);
    }

    if (date1.getFullYear() < date2.getFullYear()) {
      return -1;
    } else if (date1.getFullYear() > date2.getFullYear()) {
      return 1;
    } else {
      if (date1.getMonth() < date2.getMonth()) {
        return -1;
      } else if (date1.getMonth() > date2.getMonth()) {
        return 1;
      } else {
        if (date1.getDate() < date2.getDate()) {
          return -1;
        } else if (date1.getDate() > date2.getDate()) {
          return 1;
        } else {
          return 0;
        }
      }
    }
  }

  compareDateStrings(first, second) { // this function determines whether the first date string is earlier than second

    var date1 = first;
    var date2 = second;  
    if (typeof date1 === 'string') {
      date1 = new Date(date1);
    }
    if (typeof date2 === 'string') {
      date2 = new Date(date2);
    }
    if (date1.getFullYear() < date2.getFullYear()) {
      return -1;
    } else if (date1.getFullYear() > date2.getFullYear()) {
      return 1;
    } else {
      if (date1.getMonth() < date2.getMonth()) {
        return -1;
      } else if (date1.getMonth() > date2.getMonth()) {
        return 1;
      } else {
        if (date1.getDate() < date2.getDate()) {
          return -1;
        } else if (date1.getDate() > date2.getDate()) {
          return 1;
        } else {
          return 0;
        }
      }
    }
  }

  pickDate(pickedSlot) {
    if (!this.state.availability.length) {
      var sameDateClickedTwice = false;
    }
    var availabilityDuplicate = this.state.availability.slice();
    for (var i = 0; i < availabilityDuplicate.length; i++) {
      var sameDateClickedTwice = false;
      var formatedStartDateFromDB = new Date(availabilityDuplicate[i]['start']);
      if (typeof pickedSlot.start === 'string') {
        var formatedPickedSlotStartDate = new Date(pickedSlot.start);
      } else {
        var formatedPickedSlotStartDate = pickedSlot.start;
      }
      if ( (formatedPickedSlotStartDate.toString() === formatedStartDateFromDB.toString()) && (this.state.user.display === availabilityDuplicate[i]['title']) ) {
        let deleteMe = availabilityDuplicate[i].id;
        sameDateClickedTwice = true;    
        this.setState({overlapAvailabilities: this.compareToSelectDates()});
        axios.post('/availability/delete', {
          'id': deleteMe
        })
          .then((res) => {
            this.props.socket.emit('clientAvailabilityDelete', deleteMe);
          })
          .catch((err) => {
            console.log(err);
          });
        break;
      }
    }

    if (!sameDateClickedTwice) {
      let newAvailability = {
        'id': null,
        'title': this.state.user.display,
        'start': pickedSlot.start,
        'end': pickedSlot.end
      };
      axios.post('/availability/byTripId', newAvailability)
        .then((posted) => {
          newAvailability.id = posted.data.id;
          this.props.socket.emit('clientAvailabilityAdd', newAvailability);    
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }

  currentDateIsSingle(day) {
    var currentStartDate = new Date(day.start).getDate();
    var currentEndDate = new Date(day.end).getDate();   
    return currentStartDate === currentEndDate;
  }

  checkForConnectedAvailability() {
    var availabilityObj = this.turnAvailabilityToOjb();
    console.log('availability obj: ', availabilityObj);
    var currentUserName = this.state.user.display;
    for (var i = 0; i < availabilityObj[currentUserName].length - 1; i++) {
      var startDateOneDayAfteri = new Date(availabilityObj[currentUserName][i + 1].start).getDate();      
      var wantToBreak = false;
      if ( this.currentDateIsSingle(availabilityObj[currentUserName][i]) ) {
        this.connectSingleAvailability(availabilityObj, currentUserName, i);
        if (wantToBreak) {
          break;
        }
      } else {
        this.connectMultipleAvailability(availabilityObj, currentUserName, i);
        if (wantToBreak) {
          break;
        }
      }
    }
  }

  addAvailabilityByRange(startDateStartString, endDateStartString, endDateEndString, idsToDelete) {
    var startDateStart = new Date(startDateStartString);
    var endDateStart = new Date(endDateStartString);
    var endDateEnd = new Date(endDateEndString);
    var newEndDateYear = endDateEnd.getFullYear();
    var newEndDateMonth = endDateEnd.getMonth();
    if (endDateStart.getDate() === endDateEnd.getDate()) {
      var newEndDateDate = endDateEnd.getDate() + 1;
    } else {
      var newEndDateDate = endDateEnd.getDate();
    }
    let newAvailability = {
      'id': null,
      'title': this.state.user.display,
      'start': startDateStart,
      'end': new Date(newEndDateYear, newEndDateMonth, newEndDateDate)
    };
    axios.post('/availability/byTripId', newAvailability)
      .then((posted) => {
        newAvailability.id = posted.data.id;
        this.props.socket.emit('clientAvailabilityAdd', newAvailability);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  deleteMultipleDates(idArrayTobeDeleted) {
    axios.post('/availability/MultipleDelete', {
      'ids': idArrayTobeDeleted
    })
      .then((res) => {
        this.setState({
          addingMultipleAvailability: false
        }, () => {
          this.props.socket.emit('clientAvailabilityMultipleDelete', idArrayTobeDeleted);
        });
      })
      .catch((err) => {
        console.log(err);
      });
  }

  connectSingleAvailability(availabilityObj, currentUserName, i) {

    var iEndDate = new Date(availabilityObj[currentUserName][i].end).getDate();
    var startDateOneDayAfteri = new Date(availabilityObj[currentUserName][i + 1].start).getDate();

    var idsToDelete = [];    

    if (iEndDate === startDateOneDayAfteri - 1) {
      
      if (availabilityObj[currentUserName][i + 2] !== undefined) {
        var endDateOneDayAfteri = new Date(availabilityObj[currentUserName][i + 1].end).getDate();
        var startDateTwoDaysAfteri = new Date(availabilityObj[currentUserName][i + 2].start).getDate();

        if (endDateOneDayAfteri === startDateTwoDaysAfteri - 1) {

          idsToDelete.push(availabilityObj[currentUserName][i].id, availabilityObj[currentUserName][i + 1].id, availabilityObj[currentUserName][i + 2].id);

          this.setState({
            addingMultipleAvailability: true
          }, () => {
            this.addAvailabilityByRange(availabilityObj[currentUserName][i].start, availabilityObj[currentUserName][i + 2].start, availabilityObj[currentUserName][i + 2].end, idsToDelete);
          });
          
          this.deleteMultipleDates(idsToDelete);

          wantToBreak = true;
          return;
        } else {
          
          idsToDelete.push(availabilityObj[currentUserName][i].id, availabilityObj[currentUserName][i + 1].id);

          this.addAvailabilityByRange(availabilityObj[currentUserName][i].start, availabilityObj[currentUserName][i + 1].start, availabilityObj[currentUserName][i + 1].end, idsToDelete);

          this.deleteMultipleDates(idsToDelete);
        }

      } else {

        idsToDelete.push(availabilityObj[currentUserName][i].id, availabilityObj[currentUserName][i + 1].id);

        this.addAvailabilityByRange(availabilityObj[currentUserName][i].start, availabilityObj[currentUserName][i + 1].start, availabilityObj[currentUserName][i + 1].end, idsToDelete);

        this.deleteMultipleDates(idsToDelete);
      }
    }
  }

  connectMultipleAvailability(availabilityObj, currentUserName, i) {
    var iEndDate = new Date(availabilityObj[currentUserName][i].end).getDate();
    var startDateOneDayAfteri = new Date(availabilityObj[currentUserName][i + 1].start).getDate();

    var idsToDelete = [];    

    // range events end dates is actually one day after to correctly render on the
    // calendar, so we just compare the end date and the next date's start eg.
    // 9/13 ~ 9/15, 9/16. The 9/13 ~ 9/15 is actually 9/13 ~ 9/16, so we compare
    // whether the end date of i is the same as the start date of i + 1
    if (iEndDate === startDateOneDayAfteri) {
      
      // to prevent i + 2 gets out of array range
      if (availabilityObj[currentUserName][i + 2] !== undefined) {
        var endDateOneDayAfteri = new Date(availabilityObj[currentUserName][i + 1].end).getDate();
        var startDateTwoDaysAfteri = new Date(availabilityObj[currentUserName][i + 2].start).getDate();
        // if the new picked date is in the middle of two dates, ex. originally
        // had 9/3, 9/5, then pick 9/4, we shall combine the activities
        if (endDateOneDayAfteri === startDateTwoDaysAfteri - 1) {
          // connect i, i + 1 and i + 2
          idsToDelete.push(availabilityObj[currentUserName][i].id, availabilityObj[currentUserName][i + 1].id, availabilityObj[currentUserName][i + 2].id);

          this.setState({
            addingMultipleAvailability: true
          }, () => {
            this.addAvailabilityByRange(availabilityObj[currentUserName][i].start, availabilityObj[currentUserName][i + 2].start, availabilityObj[currentUserName][i + 2].end, idsToDelete);
          });
          
          this.deleteMultipleDates(idsToDelete);

          wantToBreak = true;
          return;

        // 2 days after is in range, but not connected to the new added date
        } else {
          // connect i and i + 1
          idsToDelete.push(availabilityObj[currentUserName][i].id, availabilityObj[currentUserName][i + 1].id);
          this.addAvailabilityByRange(availabilityObj[currentUserName][i].start, availabilityObj[currentUserName][i + 1].start, availabilityObj[currentUserName][i + 1].end, idsToDelete);
          this.deleteMultipleDates(idsToDelete);
        }
      // 2 days after is out of range, but i and i + 1 are still connected
      } else {
        // connect i and i + 1
        idsToDelete.push(availabilityObj[currentUserName][i].id, availabilityObj[currentUserName][i + 1].id);
        this.addAvailabilityByRange(availabilityObj[currentUserName][i].start, availabilityObj[currentUserName][i + 1].start, availabilityObj[currentUserName][i + 1].end, idsToDelete);
        this.deleteMultipleDates(idsToDelete);
      }
    }
  }

  render() {
    // should give an explicit height based on documentation
    var style = {
      height: '400px'
    };

    return (
      <div style={style} {...this.props}>
        <BigCalendar
          selectable
          popup
          events = {this.state.availability}
          defaultDate={ new Date() } // set to current date
          onSelectEvent={ (name) => {
            // unpick for clicking on name cause it is more intuitive
            this.pickDate(name);
          }
          }
          onSelectSlot={ (slotInfo) => {
            this.pickDate(slotInfo);
          }
          }
        />
        <div>
          <br/>
        </div>

      </div>
    );
  }
}

export default Calendar;
