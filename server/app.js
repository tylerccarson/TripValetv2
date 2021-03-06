'use strict';
const express = require('express');
const path = require('path');
const middleware = require('./middleware');
const routes = require('./routes');
var upload = middleware.multer();
const app = express();

app.use(middleware.morgan('dev'));
app.use(middleware.cookieParser());
app.use(middleware.bodyParser.urlencoded({extended: true}));
app.use(middleware.bodyParser.json());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(upload.any());

app.use(middleware.auth.session);
app.use(middleware.passport.initialize());
app.use(middleware.passport.session());
app.use(middleware.flash());

app.use(express.static(path.join(__dirname, '../public')));

app.use('/', routes.auth);
app.use('/images', routes.images);
app.use('/api', routes.api);
app.use('/api/profiles', routes.profiles);
app.use('/trips', routes.trips);
app.use('/messages', routes.messages);
app.use('/confirmed', routes.confirmed);
app.use('/user', routes.user);
app.use('/availability', routes.availability);
app.use('/schedules', routes.schedules);



module.exports = app;
