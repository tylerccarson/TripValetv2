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
  //why is there only one user associated with each trip? Don't we want anybody who has been invited to also be there?
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




/* Keys for trips contain
  id
  tripname
  description
  location
  creator mail
*/

