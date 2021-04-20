const config = require("./config");

const { Sequelize, DataTypes, Model } = require('sequelize');

const express = require("express");
const bodyParser = require("body-parser")
const { initializeControllers } = require("./controllers");

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;


const loadedConfig = config.loadConfig();

let sequelize = null;
if (loadedConfig.db.host === 'sqlite::memory:') {
    sequelize = new Sequelize(loadedConfig.db.host, {
        logging: console.log
    })
    console.log('database connection successful', host)
} else {
    const { database, username, password, dialect, host } = loadedConfig.db;
    sequelize = new Sequelize(database, username, password, {
        dialect,
        host,
    })
    console.log('database connection successful', host)
}

class User extends Model {}
User.init({
    email: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    username: {
        type: DataTypes.STRING,
        defaultValue: '',
    },
    password_hash: {
        type: DataTypes.STRING,
        defaultValue: '',
    },
    password_salt: {
        type: DataTypes.STRING,
        defaultValue: '',
    },
    hash_function: {
        type: DataTypes.STRING,
        defaultValue: '',
    },
    role: {
        type: DataTypes.STRING,
        defaultValue: '',
    }
}, { sequelize, modelName: 'user' })

passport.use(new LocalStrategy(
    function(username, password, done) {
        User.findOne({ username: username });
        const validPassword = (given_password, user_password) => given_password === user_password;
        const authenticate = function(err, user) {
            if (err) { return done(err); }
            if (!user) {
                return done(null, false, { message: 'Incorrect username.' });
            }
            if (!validPassword(password, user.password)) {
                return done(null, false, { message: 'Incorrect password.' });
            }
            return done(null, user);
        }
    }
));

try {
    sequelize.sync().then(async () => {

        const jane = await User.create({
          username: 'janedoe',
        });
        console.log(jane.toJSON());
    
    }).then(() => {
    
        if (sequelize !== null) {
            const app = express()
            
            // middleware
            app.use(bodyParser.urlencoded({ extended: true }))
            app.use('/', express.static('src/pages/'));
    
            // the controllers are defined in the 'initialize controllers' function.
            // initializeControllers(app);
    
            app.post('/login', passport.authenticate('local', { successRedirect: '/test/good',
                                                    failureRedirect: '/test/bad' }));
    
            const port = loadedConfig.port;
            app.listen(port, () => {
                console.log('App started on port', port)
            })
        
        } else {
            console.error('database failed to initialize');
        }
    
    })
} catch(error) {
    console.log(error)
}





