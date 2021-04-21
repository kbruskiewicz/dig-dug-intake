const config = require("./config");

const { Sequelize, DataTypes, Model, UniqueConstraintError } = require('sequelize');

const express = require("express");

const crypto = require('crypto');
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const flash = require("connect-flash");

const loadedConfig = config.loadConfig();

// TODO: HTTPS
const app = express();
// middleware
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({
    secret: loadedConfig.session_key,
    resave: true,
    saveUninitialized: true
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

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
        logging: console.log
    })
}

// an enum class
function initEnumClass(sequelize, SequelizeModel, modelName, prop='name') {
    SequelizeModel.init({ [prop]: { type: DataTypes.STRING, defaultValue: '' } }, { sequelize, modelName })
}

class UserRole extends Model {};
initEnumClass(sequelize, UserRole, 'user_role', 'role');

class User extends Model {}
User.init({
    
    // authentication information
    username: {
        type: DataTypes.STRING,
    },
    password_hash: {
        type: DataTypes.STRING,
    },
    password_salt: {
        type: DataTypes.STRING,
    },
    hash_function: {
        type: DataTypes.STRING,
    },

    // useful metadata
    email: {
        type: DataTypes.STRING,
        validate: {
            isEmail: true,            // checks for email format (foo@bar.com)
        }
    },
    role: {
        // TODO: roles - how to generate them programatically? => reference another table => convert to FKEYS
        type: DataTypes.ENUM(''),
        defaultValue: '',
    }

}, { sequelize, modelName: 'user' });
UserRole.belongsTo(User);

// convert passwords into cryptographically secure information

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


passport.use(new LocalStrategy(
    async function(username, password, done) {

        const user = await User.findOne({ 
            where: { username } 
        });

        const authenticate = function(err=null, user) {
            if (err) { return done(err); }
            
            if (!user) {
                return done(null, false, { message: 'Incorrect username.' });
            }

            const userModel = user.dataValues;
            if (validatePassword(password, userModel.password_salt, userModel.hash_function)(userModel.password_hash)) {
                return done(null, userModel);
            } else {
                return done(null, false, { message: 'Incorrect password.' });
            }
        }

        authenticate(null, user);
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



async function userExists(username) {
    return await User.findOne({ where: { username } })
}

async function registerUser(username, password, email, role, salt=shakeSalt(), hash_function=loadedConfig.crypto.hash_implementation) {
    // TODO: guarantee that user IDs are UUIDs
    // should be generated in SQL
    if (!(await userExists(username))) {
        const user = await User.create({
            username: username,
            password_salt: salt,
            password_hash: obscurePassword(password, hash_function, salt),
            hash_function: hash_function,
            email,
            role,
        });
        return user;
    } else {
        return null;
    }
}

class DatasetState extends Model {};
// DatasetState.init({ state: { type: DataTypes.STRING, defaultValue: '' } }, { sequelize, modelName: 'dataset_state' });
initEnumClass(sequelize, DatasetState, 'dataset_state', 'state');

class DatasetSource extends Model {};
// DatasetSource.init({ source:  { type: DataTypes.STRING, defaultValue: '' }  }, { sequelize, modelName: 'dataset_source' });
initEnumClass(sequelize, DatasetSource, 'dataset_source', 'source');

class DatasetType extends Model {};
// DatasetType.init({ type:  { type: DataTypes.STRING, defaultValue: '' }  }, { sequelize, modelName: 'dataset_type' });
initEnumClass(sequelize, DatasetType, 'dataset_type', 'type');


class Dataset extends Model {}
Dataset.init({
    user_id: DataTypes.STRING,
    accession_id: {
        type: DataTypes.STRING,
        defaultValue: '',
    },
    
    name: {
        type: DataTypes.STRING,
        defaultValue: '',
    },
    institution: {
        type: DataTypes.STRING,
        defaultValue: '',
    },
    principal_investigator: {
        type: DataTypes.STRING,
        defaultValue: '',
    },

    source: {
        // TODO: sources - how to generate them programatically? => reference another table => convert to FKEYS
        type: DataTypes.ENUM(''),
        defaultValue: '',
    },
    state: {
        // TODO: states - how to generate them programatically? => reference another table => convert to FKEYS
        type: DataTypes.ENUM(''),
        defaultValue: '',
    },
    datatype: {
        // TODO: states - how to generate them programatically? => reference another table => convert to FKEYS
        type: DataTypes.ENUM(''),
        defaultValue: '',
    },

    embargo_date: DataTypes.DATE,

}, { sequelize, modelName: 'datasets' })

DatasetState.belongsTo(Dataset); 
DatasetSource.belongsTo(Dataset); 
DatasetType.belongsTo(Dataset); 


async function datasetExists(/*{ ...primaryKeyInformation }*/) {
    // return !!(await Dataset.findOne({ where: { ...primaryKeyInformation } }));
    return true;
}

async function registerDataset(user_id, name, institution, principal_investigator, source, state, datatype, embargo_date) {
    if (!datasetExists(/* name? */)) {
        const dataset = await Dataset.create({
            user_id,
            // accessions should either be generated here or within SQL
            // only constraint is that it must be a file-system compatible string (SO: keep it alphanumeric)
            name,
            institution,
            principal_investigator, 
            source,
            state,
            datatype,
            embargo_date,
        });
        return dataset;
    } else {
        return null;
    }
};

// initialize resources
try {
    sequelize.sync().then(async () => {
        
        const username = loadedConfig.test.username;
        const password = loadedConfig.test.password;

        if (!!username && !!password) {
            
            let test_user = await registerUser(username, password);
            if (test_user) {
                console.log(test_user.toJSON())
            } else {
                console.log(username, 'already exists')
            }

            if (test_user === null) {
                test_user = await User.findOne({ where: { username }});
            }

        };

        let context = {};  // e.g. call the databases for some state so that it can be used in functions below
        return context;

    }).then(context => {
    
        if (sequelize !== null) {
            
            app.use('/', express.static('src/pages/'));
            // TODO: model page flow
            app.get('/register', (_, res) => res.redirect('/register.html'));
            app.get('/login', (_, res) => res.redirect('/index.html'));
            app.get('/datasets', (_, res) => res.redirect('/datasets.html'));
            app.get('/upload', (_, res) => res.redirect('/uploader.html'));
            app.get('/download', (_, res) => res.redirect('/downloader.html'));

            app.get('/test/success', (req, res) => {
                console.log('success')
                res.send('/')
            })

            app.get('/test/fail', (req, res) => {
                console.log('error')
                res.send(500)
            })
            // the controllers are defined in the 'initialize controllers' function.
            // initializeControllers(app);
    
            app.post('/do/user/login', function(req, res, next) {
                    passport.authenticate('local', function(err, user, info) {
                        if (err) {  
                            return next(err);   
                        }
                        if (!user) { 
                            // TODO: populate form with defaults?
                            return res.redirect('/register'); 
                        }
                        req.logIn(user, function(err) {
                            if (err) { 
                                return next(err); 
                            }
                            return res.redirect('/datasets/' + user.id);
                        });
                    })(req, res, next)
                }
            );

            app.post('/do/user/login/google', function(req, res, next) {
                res.send(501)
            });

            // DONE
                // except... sending encrypted password over wire on clientside
            app.post('/do/user/register', async (req, res) => {
                const { username, password, email, role } = req.body;
                const newUser = await registerUser(username, password, email, role);
                if (newUser) {
                    return res.send(200)
                } else {
                    return res.send(304)
                }
            });

            app.post('/do/datasets/register', async (req, res) => {

                const { user_id='',
                        accession_id='',
                        name='',
                        institution='',
                        principal_investigator='',
                        source='',
                        state='',
                        datatype='',
                        // CHECK COMPLIANCE => if compliant, EMBARGO LIFT TIME IS NOW. If not, ask for the later EMBARGO DATE
                        embargo_date='' } = req.body;
                const dataset = await registerDataset(
                    user_id,
                    accession_id,
                    name,
                    institution,
                    principal_investigator,
                    source,
                    state,
                    datatype,
                    embargo_date,
                )
                if (dataset) {
                    return res.send(200)
                } else {
                    return res.send(304)
                }
            });
            
            // TODO: gets datasets => post or query params?
            app.get('/datasets/:userId', async (req, res) => {
                const datasets = await Dataset.findAll({ where: { user_id: req.params.userId }});
                if (datasets) {
                    res.send(datasets)
                } else {
                    res.send(404)
                }
            });

            // TODO: use querystrings to find arbitrary datasets?
            // ensure session is used to check if authenticated and compatible with role
            app.post('/do/query/datasets', async (req, res) => {
                const query = {
                    where: {
                        ...res.body
                    }
                }
                const datasets = await Dataset.findAll(query);
                // TODO: filter by user permissions!
                if (datasets) {
                    res.send(datasets)
                } else {
                    res.send(404)
                }
            });

            // enum endpoints
            app.get('/datasets/states/', async (req, res) => {
                const results = await DatasetState.findAll();
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(results));
            });
            app.get('/datasets/datatypes/', async (req, res) => {
                const results = await DatasetType.findAll();
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(results));
            });
            app.get('/datasets/sources/', async (req, res) => {
                const results = await DatasetSource.findAll();
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(results));
            });
            app.get('/users/roles/', async (req, res) => {
                const results = await UserRole.findAll();
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(results));
            });

            const port = loadedConfig.port;
            app.listen(port, () => {
                console.log('App started on port:', port)
            })
        
        } else {
            console.error('database failed to initialize');
        }
    
    })
} catch(error) {
    console.log(error)
}





