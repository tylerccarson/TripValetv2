const models = require('../../db/models');
const Promise = require('bluebird');
const db = require('../../db');

module.exports.getAll = (req, res) => {

  models.Trip.fetchAll()
    .then(trips =>{
      
      trips = trips.models.map(trip=>{return trip.attributes;});
      res.status(200).send(trips);
    })
    .catch(err => {
      console.log(err);
      res.status(503).send(err);
    });
};

module.exports.getTripsByUserEmail = (req, res ) => { // this is used when we want to fetch all trips by a user on dashboard.
  var email = { email: req.body.email }; // this may change depending on actual request form.
  models.Confirmed.where(email).fetchAll()
    .then((confirms)=>{
      var tripIds = confirms.models.map((confirm)=>{
        return confirm.attributes.trip_id;
      });
      return models.Trip.where('id', 'IN', tripIds).fetchAll();
    })
    .then((trips)=>{
      res.status(200).send(trips);
    })
    .catch((err)=>{
      res.status(503).send(err);
    });

};

module.exports.createTrip = (req, res) => {

  models.Trip.forge({
    tripname: req.body.tripname,
    description: req.body.description,
    location: req.body.location,
    rangeStart: req.body.rangeStart,
    rangeEnd: req.body.rangeEnd,
    user_id: req.session.passport.user

  }).save()
    .then(trip => {
      var trip = trip.attributes;

      models.Profile.where({id:trip.user_id}).fetch()
        .then((user)=>{
          if (!user) {
            throw user;
          }

          let Confirms = db.Collection.extend({
            model: models.Confirmed
          });

          var invitations = req.body.invited.map((email)=>{
            return {
              trip_id: trip.id,
              email: email
            };
          });

          var creator = models.Confirmed.forge({
            user_id: trip.user_id,
            trip_id: trip.id,
            email: user.attributes.email
          });

          var confirms = Confirms.forge([
            ...invitations, creator
          ]);
          Promise.all(confirms.invokeMap('save'))
            .then(confirms=>{
              console.log('Confirmations created: ', confirms);
              console.log('----------------------',user);
              console.log('----invite ', invitations);
              console.log('trip name :', trip.tripname);

              var invitees = [];

              for (var i = 0; i < invitations.length; i++) {
                invitees.push(invitations[i].email);
              }
              console.log('email array: ', invitees);

              // sendInviteEmail(user.display, trip.tripName, invitees);

              res.status(201).send(trip);

            })
            .catch(err => {
              console.log('ERROR: ', err);
              res.status(503).send(err);
            });

        });
    })
    .catch(err => {
      console.log(err);
      res.status(503).send(err);
    });

};

module.exports.getTripsByUserSessionId = (req, res) => {

  models.Trip.where({user_id: req.session.passport.user}).fetchAll()
    .then((trips)=>{
      trips = trips.models.map(trip=>{return trip.attributes;});
      res.status(200).send(trips);
    })
    .catch((err)=>{
      console.log('ERROR fetching Trips for current user');
      res.status(503).send(err);
    });

  
};

/* NOTE ON HOW TO SEND EMAIL FOR LEE
  models.Confirmed.where({trip_id: 2})
    .then(confirm=>{
      var emails = confirm.map(confirm=>{return confirm.email;}); //[test@test.com, test1@test.com]

      // {id: 1, trip_id:2, user_id:1, email: test@test.com, confirm: false}
      

    })

*/

function sendInviteEmail(inviterName, tripName, invitees) {
  
  var api_key = 'key-ed15d9b7166f3bbab71cec2127e6b019';
  var domain = 'mg.tripvalet.me';
  var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});


  var mailOptions = {
    from: 'Trip Valet <postmaster@mg.tripvalet.me>',
    to: invitees,
    subject: `${inviterName} has invited you to ${tripName} on TripValet!`,
    html: `
            <p>This is a automatically generate email, please do not reply.</p>
            <p> ${inviterName} has invided you to ${tripName}!</p>
            <br />
            <a href = https://tripvalet.herokuapp.com/ >Go to TripValet to see more details</a>
            <br />
            
            <p>If you have any further questions, please email weiyilee17@tripvalet.me</p>
          `
          
  };

  mailgun.messages().send(mailOptions, function(error, response) {
    if (error) {
      console.log('error happened sending mail: ', error);
      res.end('error');
    } else {
      console.log('message sent ' + response);
      console.log(response);
      res.end('sent');
    }
  });
}



/* Keys for trips contain
  id
  tripname
  description
  location
  creator mail
*/

