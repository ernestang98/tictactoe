const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('./user');
require('dotenv').config()

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `http://${process.env.HOSTNAME}:${process.env.PORT}/auth/google/callback`,
    passReqToCallback: true,
  },
  function(request, accessToken, refreshToken, profile, done) {
    User.findOne({$or:[{"email": profile.email},{"oauth_id":profile.id}]}, function (err, user){ 
      if (user) {
        console.log("User already registered using local passport!")
        if (!user.oauth_id) {
          console.log("Adding id...")
          user.oauth_id = profile.id
          user.save().then((newUser) => {
          })
        }
        return done(null, user);
      }
      else{
        new User({
            name: profile.displayName,
            email: profile.email,
            oauth_id: profile.id
        }).save().then((newUser) => {
          return done(null, newUser);
        });
      }
    }); 
  })
);

passport.use(
  new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
    User.findOne({
      email: email
    }).then(user => {
      if (!user) {
        console.log('That email is not registered')
        return done(null, false);
      }
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) throw err;
        if (isMatch) {
          return done(null, user);
        } else {
          console.log('Password incorrect')
          return done(null, false);
        }
      });
    });
  })
)

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});