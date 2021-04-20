const config = require("./config");

const { Sequelize, DataTypes, Model } = require('sequelize');

const express = require("express");

const crypto = require('crypto');

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

const loadedConfig = config.loadConfig();

let sequelize = null;
if (loadedConfig.db.host === 'sqlite::memory:') {
    sequelize = new Sequelize(loadedConfig.db.host, {
        logging: console.log
    })
} else {
    const { database, username, password, dialect, host } = loadedConfig.db;
    sequelize = new Sequelize(database, username, password, {
        dialect,
        host,
    })
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
        defaultValue: ''
    },
    role: {
        type: DataTypes.STRING,
        defaultValue: '',
    }
}, { sequelize, modelName: 'user' })

// convert passwords into cryptographically secure information

// first: salt generator
const shakeSalt = (
    buffer_size=10
) => {
    const buf = Buffer.alloc(buffer_size);
    return crypto.randomFillSync(buf).toString('hex')
}

// use pbkdf2 (node implementation)
const obscurePassword = (
    password,
    hash_implementation,
    salt=shakeSalt(),
) => crypto.pbkdf2Sync(password, salt, 100000, 32, hash_implementation).toString('hex');

// validate presented password strings against the obscured password
const validatePassword = (
    given_password, 
    password_salt, 
    hash_implementation
) => obscured_password => obscurePassword(given_password, hash_implementation, password_salt) === obscured_password;

passport.use(new LocalStrategy(
    async function(username, password, done) {
        console.log('attempting to authenticate with local strategy,', username, password);
        const user = await User.findOne({ 
            where: { username } 
        });

        const authenticate = function(err=null, user) {
            if (err) { return done(err); }
            
            if (!user) {
                return done(null, false, { message: 'Incorrect username.' });
            }

            if (validatePassword(password, user.password_salt, user.hash_function)(user.password_hash)) {
                console.log('password is valid', password, user.password_hash)
                return done(null, user);
            } else {
                console.log('password is not valid', password, user.password_hash)
                return done(null, false, { message: 'Incorrect password.' });
            }
        }
        
        if (user !== null) {
            console.log('found a match! authenticating...')
            authenticate(null, user.dataValues)
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    const user = await User.findOne({ 
        where: { id } 
    });    
    done(null, user);
});

const app = express()
// middleware
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({
    secret: loadedConfig.session_key,
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

// initialize resources
try {
    sequelize.sync().then(async () => {
        
        const salt = shakeSalt();
        const hash_function = loadedConfig.crypto.hash_implementation;
        const password_hash = obscurePassword('janedoe', hash_function, salt)
        console.log(password_hash)

        const jane = await User.create({
            username: 'janedoe',
            password_salt: salt,
            password_hash: obscurePassword('janedoe', hash_function, salt),
            hash_function: hash_function
        });

        console.log(jane.toJSON());
    
    }).then(() => {
    
        if (sequelize !== null) {
            
            app.use('/', express.static('src/pages/'));
    
            // the controllers are defined in the 'initialize controllers' function.
            // initializeControllers(app);
    
            app.post('/login', 
                passport.authenticate('local', { successRedirect: '/test/success',
                                                 failureRedirect: '/test/fail' }))
    
            app.get('/test/success', (req, res) => {
                console.log('success')
                res.send(200)
            })

            app.get('/test/fail', (req, res) => {
                console.log('error')
                res.send(500)
            })

            const port = loadedConfig.port;
            app.listen(port, () => {
                console.log('App started on port:                ', port)
            })
        
        } else {
            console.error('database failed to initialize');
        }
    
    })
} catch(error) {
    console.log(error)
}





