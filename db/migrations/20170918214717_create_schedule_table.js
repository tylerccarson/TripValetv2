
exports.up = function(knex, Promise) {
    return Promise.all([
    knex.schema.createTableIfNotExists('schedules', function (table) {
      table.increments('id').unsigned().primary();
      table.integer('trip_id').references('trips.id').onDelete('CASCADE');
      table.integer('day').notNullable();
      table.string('title', 255).notNullable();
      table.text('url').nullable();
    })
  ]);
};

exports.down = function(knex, Promise) {
  kreturn Promise.all([
    knex.schema.dropTable('schedules');
  ]);
};
