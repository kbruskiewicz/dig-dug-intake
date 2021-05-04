const config = require("../../config");
const loadedConfig = config.loadConfig();

const crypto = require("crypto");
const model = require("./modelUtils");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require( 'passport-google-oauth20' ).Strategy;

// convert passwords into cryptographically secure information
//

// first: salt generator
const shakeSalt = (
    buffer_size=10
) => {
    const buf = Buffer.alloc(buffer_size);
    return crypto.randomFillSync(buf).toString('hex');
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


// LOGIN STRATEGIES //

const localStrategyImpl = new LocalStrategy(
    async function(username, password, done) {
        const user = await model.userExists({ username });
        const authenticate = function(err=null, user) {
            if (err) { return done(err); }
            
            if (!user) {
                return done('nouser', false, { message: 'Incorrect username.' });
            }
            const userModel = user.dataValues;
            if (authUtils.validatePassword(password, userModel.password_salt, userModel.hash_function)(userModel.password_hash)) {
                return done(null, userModel);
            } else {
                return done('nopassword', false, { message: 'Incorrect password.' });
            }
        }
        authenticate(null, user);
    }
);

// TODO: external account login verification

// TODO: google login
const googleStrategyImpl = new GoogleStrategy({
    clientID: loadedConfig.auth.google.clientId,
    clientSecret: loadedConfig.auth.google.secretId,
    // callbackURL: `http://${loadedConfig.auth.google.callbackHost}`
  },
  function(accessToken, refreshToken, profile, cb) {
        console.log(profile)
        // User.findOrCreate({ googleId: profile.id }, function (err, user) {
        //     return cb(err, user);
        // });
  }
)

// END LOGIN STRATEGIES //

module.exports = {
    shakeSalt,
    obscurePassword,
    validatePassword,
    strategy: {
        local: localStrategyImpl,
        google: googleStrategyImpl,
    }
}