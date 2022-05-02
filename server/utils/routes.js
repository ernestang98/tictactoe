const passport = require('passport');
const session = require('express-session');
require('./passport_utils');
const User = require('./user');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const cookie = require('cookie');

class Routes {
  constructor(app, redisDB) {
    this.redisDB = redisDB;
    this.app = app;
  }

  appRoutes(){
    this.app.get("/", (req, res) => {
      res.status(200).json({
        'status': 'hello world'
      })
    })
  }

  appRoutesforRedis(){
    this.app.get('/getRoomStats', (request, response) => {
      Promise.all(['totalRoomCount','allRooms'].map(key => this.redisDB.getAsync(key))).then(values => {
        const totalRoomCount = values[0];
        const allRooms = JSON.parse(values[1]);
        response.status(200).json({
          'totalRoomCount' : totalRoomCount,
          'fullRooms' : allRooms['fullRooms'],
          'emptyRooms': allRooms['emptyRooms']
        });
      });
    });
  }

  appRoutesforPassport() {
    // https://stackoverflow.com/questions/62407074/expressnodejs-how-to-decrypt-express-session-cookie-during-socket-io-connect
    // https://stackoverflow.com/questions/48582939/where-is-the-express-session-cookie-hidden
    // const cookieVisualizer = function (req, res, next) {
    //   const cookieString = req.headers.cookie;
    //   if (cookieString) {
    //     const cookieParsed = cookie.parse(cookieString);
    //     if (cookieParsed) {
    //       const sidParsed = cookieParser.signedCookie(cookieParsed["connect.sid"], 'cats');
    //     }
    //   }
    //   next()
    // }
    // this.app.use(cookieVisualizer)

    this.app.get('/auth', (req, res) => {
      res.send('<a href="/auth/google">Authenticate with Google</a>');
    });

    this.app.get('/auth/google',
      passport.authenticate('google', { scope: [ 'email', 'profile' ] }
    ));

    this.app.get( '/auth/google/callback',
      passport.authenticate( 'google', {
        successRedirect: '/protected',
        failureRedirect: '/auth/google/failure'
      })
    );

    this.app.get('/auth/google/failure', (req, res) => {
      res.send('Failed to authenticate..');
    });

    this.app.get('/protected', this.isLoggedIn, (req, res) => {
      if (req.user.name) {
        res.send(`Hello ${req.user.name}`);
      } else {
        res.send(`Hello ${req.user.displayName}`);
      }
    });

    this.app.get('/logout', (req, res) => {
      req.logout();
      req.session.destroy();
      res.send('Goodbye!');
    });

    this.app.post('/login', (req, res, next) => {
      passport.authenticate('local', {
        successRedirect: '/protected',
        failureRedirect: '/login',
        failureFlash: true
      })(req, res, next);
    });

    this.app.post('/register', (req, res) => {
      const { name, email, password, password2 } = req.body;
      let errors = [];

      if (!name || !email || !password || !password2) {
        errors.push({ msg: 'Please enter all fields' });
      }

      if (password != password2) {
        errors.push({ msg: 'Passwords do not match' });
      }

      try {
        if (password.length < 6) {
          errors.push({ msg: 'Password must be at least 6 characters' });
        }
      }
      catch (e) {}
      if (errors.length > 0) {
        console.log(`Errors are: ${JSON.stringify(errors)}`)
        res.redirect('/register')
      } else {
        User.findOne({ email: email }).then(user => {
          if (user) {
            console.log(`Errors are: ${JSON.stringify(errors)}`)
          } else {
            bcrypt.genSalt(10, (err, salt) => {
              bcrypt.hash(password, salt, (err, hash) => {
                if (err) throw err;
                const newUser = new User({
                  name,
                  email,
                  "password": hash
                });
                newUser.save()
                  .then(user => {
                    res.redirect('/login');
                  })
                  .catch(err => console.log(err));
              });
            });
          }
        });
      }
    });

    this.app.get('/login', (req, res) => {
      res.send(`
        <form action="/login" method="POST">
          <div class="form-group">
            <label for="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              class="form-control"
              placeholder="Enter Email"
            />
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              class="form-control"
              placeholder="Enter Password"
            />
          </div>
          <button type="submit" class="btn btn-primary btn-block">Login</button>
        </form>
      `)
    })

    this.app.get('/register', (req, res) => {
      res.send(`
        <form action="/register" method="POST">
          <div class="form-group">
            <label for="name">Name</label>
            <input
              type="name"
              id="name"
              name="name"
              class="form-control"
              placeholder="Enter Name"
              value=""
            />
          </div>
          <div class="form-group">
            <label for="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              class="form-control"
              placeholder="Enter Email"
              value=""
            />
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              class="form-control"
              placeholder="Create Password"
              value=""
            />
          </div>
          <div class="form-group">
            <label for="password2">Confirm Password</label>
            <input
              type="password"
              id="password2"
              name="password2"
              class="form-control"
              placeholder="Confirm Password"
              value=""
            />
          </div>
          <button type="submit" class="btn btn-primary btn-block">
            Register
          </button>
        </form>
      `)
    })
  }

  routesConfig(){
    this.appRoutes();
    this.appRoutesforRedis();
    this.appRoutesforPassport();
  }

  isLoggedIn(req, res, next) {
    req.user ? next() : res.sendStatus(401);
  }

}

module.exports = Routes;
