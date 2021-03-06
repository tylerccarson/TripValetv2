const db = require('../');

const Availability = db.Model.extend({
  tableName: 'availability',
  trip: function() {
    return this.belongsTo('Trip');
  },
  profile: function() {
    return this.belongsTo('Profile');
  }

});

module.exports = db.model('Availability', Availability);