const mysql = require('mysql2');
const passport = require('passport');

const { Sequelize, Model, DataTypes } = require('sequelize');
const sequelize = new Sequelize('sqlite::memory:');

const schemaUsers = {
    username: DataTypes.STRING,	
    passwrord_hash: DataTypes.STRING,
    password_salt: DataTypes.STRING,
    hash_function: DataTypes.STRING,	
    role: DataTypes.STRING,
    email: DataTypes.STRING,
}


passport.use(new passport.HashStrategy(
    function (hash, done) {

        User.findOne({ hash: hash }, function (err, user) {
            if (err) { return done(err); }
            if (!user) { return done(null, false); }
            if (!user.isUnconfirmed()) { return done(null, false); }
            return done(null, user);
        })
        
    }
))