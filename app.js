const express = require('express');
const dotenv = require('dotenv').config();
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

mongoose.connect(process.env.MONGO_URL, { useUnifiedTopology: true, useNewUrlParser: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'mongo connection error'));

const User = mongoose.model(
    'User',
    new Schema({
        username: {type: String, required: true},
        password: {type: String, required: true},
    })
);

const app = express();
app.set('views', __dirname);
app.set('view engine', 'ejs');

passport.use(
    new LocalStrategy((username, password, done) => {
        User.findOne({username: username})
            .then(user => {
                if(!user) {
                    return done(null, false, {message: 'Incorrect username'});
                }

                //check password
                bcrypt.compare(password, user.password)
                    .then(res => {
                        //passwords match
                        if(res) {
                            return done(null, user);
                        //passwords do not match
                        } else {
                            return done(null, false, {message: 'Incorrect password'});
                        }
                    })
            })
            .catch(err => done(err));
    })
);

passport.serializeUser(function(user, done) {
    //user.id is a getter for a hex string of _.id ObjectID(string) in Mongoose;
    done(null, user.id);
});
  
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

app.use(session({secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: true}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({extended: false}));

app.get('/', (req, res, next) => res.render('index', {user: req.user}));
app.get('/sign-up', (req, res, next) => res.render('sign-up-form', {errorMsg: false}));

app.post('/sign-up', async (req, res, next) => {
    let userCheck = await User.findOne({username: req.body.username});
    if(userCheck) {
        //return the response so the function finishes
        return res.render('sign-up-form', {errorMsg: 'Username already taken'});
    }
    
    let password = await bcrypt.hash(req.body.password, 10);
    
    const user = new User({
        username: req.body.username,
        password: password
    })
    .save()
    .then(success => res.redirect('/'))
    .catch(err => next(err));
});

app.get('/vip', (req, res, next) => {
    if(req.isAuthenticated()) {
        res.send('This is a VIP section only for authenticated users');
    } else {
        res.redirect('/');
    }
})

app.post('/login', passport.authenticate('local', {successRedirect: '/', failureRedirect: '/'}));

app.get('/logout', (req, res, next) => {
    req.logout();
    res.redirect('/');
    return;
})

app.listen(3000, () => console.log('app listening on port: 3000'));