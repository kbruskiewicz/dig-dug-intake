const config = require("./config");
const loadedConfig = config.loadConfig();

// model
const model = require("./src/utils/modelUtils");
const aggregations = require("./src/utils/aggregations");

// authentication
const authUtils = require("./src/utils/authUtils");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require( 'passport-google-oauth20' ).Strategy;
const flash = require("connect-flash");

// emails
const nodemailer = require("nodemailer");
const emailUtils = require("./src/utils/emailUtils")

// https
const fs = require("fs");  // will be used to read key and cert files
const https = require("https");

const express = require("express");



const app = express();

// middleware
// request data parsing middleware
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));

// authentication middleware
app.use(require('express-session')({
    secret: loadedConfig.session_key,
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

// used by authentication middleware to render status messages on events
// TODO: needs testing
app.use(flash());



// BEGIN: AUTHENTICATION CONFIGURATION

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
        // console.log(profile)
        // User.findOrCreate({ googleId: profile.id }, function (err, user) {
        //     return cb(err, user);
        // });
  }
)

// END LOGIN STRATEGIES //

passport.use(localStrategyImpl);
passport.use(googleStrategyImpl);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    const user = await model.userExists({ id });    
    done(null, user);
});
// END: AUTHENTICATION CONFIGURATION



// initialize server
try {
    // initialize database and database connection
    // synchronize model with database
    model.initDB().sync()
        // create a "context" object to be passed through the promise chain
        // lets us segregate out resource initializations (like DB, email) into different steps
        .then(() => {
            let context = {};
            return context;
        })
        // email resource initialization
        // fire out a test email to a nonesense account to ensure the connection logic works
        .then(async context => {
            let _context = context;
            let mail_transporter = null;
            let emailConfig = loadedConfig.email;

            if (!!!emailConfig) {
                // by default: this is the test transporter
                mail_transporter = await emailUtils.makeTestEmailTransporter();

                // send mail with defined transport object
                let info = await mail_transporter.sendMail({
                    from: '"Fred Foo 👻" <foo@example.com>', // sender address
                    to: "bar@example.com, baz@example.com", // list of receivers
                    subject: "Hello ✔", // Subject line
                    text: "Hello world?", // plain text body
                    html: "<b>Hello world?</b>", // html body
                });

                // console.log("Message sent: %s", info.messageId);
                // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

                // Preview only available when sending through an Ethereal account
                // console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
                // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...

            } else {
                mail_transporter = nodemailer.createTransport({
                    host: emailConfig.host,
                    port: emailConfig.port,
                    secure: emailConfig.secure,
                    auth: {
                        user: emailConfig.auth.user, // generated ethereal user
                        pass: emailConfig.auth.pass, // generated ethereal password
                    },
                });

                // TODO: test with dummy email? (signalling current deployment)

            }

            if (!!mail_transporter) {
                _context['mail_transporter'] = mail_transporter;
            }
            
            return _context;
        })
        .then(async context => {

            // test the database connection with a test user
            // the test user will also be accessible within the application
            // if no such user is given in the configuration, the test user won't be created
            // thus in a production deployment you won't require it
            // TODO: is this a bad idea to include inside the code anyway?

            const username = loadedConfig.test.username;
            const password = loadedConfig.test.password;
            const name = loadedConfig.test.name;
            const email = loadedConfig.test.email;
            const role = loadedConfig.test.role;
            const organization = loadedConfig.test.organization;

            if (!!username && !!password) {
                
                let test_user = await model.registerUser({username, password, name, email, role, organization});
                if (test_user) {
                    console.log(test_user.toJSON())
                } else {
                    console.log(username, 'already exists')
                }

                if (test_user === null) {
                    test_user = await model.userExists({ username });
                }

            }

            return context;

        })
        .then(async context => {
            
            // import html pages to be visible in the application
            app.use('/', express.static('src/pages/'));

            // import scripts into a local path
            app.use('/node_modules', express.static('/node_modules/'));

            // TODO: model page flow with state machine?
            // these endpoints rely on 'pages' being defined
            app.get('/register', (_, res) => res.redirect('/register.html'));
            app.get('/login', (_, res) => res.redirect('/index.html'));
            app.get('/datasets', (_, res) => res.redirect('/datasets.html'));
            app.get('/upload', (_, res) => res.redirect('/uploader.html'));
            app.get('/download', (_, res) => res.redirect('/downloader.html'));

            // test endpoints
            // used when modeling the logic of client functions or redirect functions
            // before their content is decided upon
            app.get('/test/success', (req, res) => {
                console.log('success')
                res.send('/')
            })
            app.get('/test/fail', (req, res) => {
                console.error('error')
                res.send(500)
            });


            // the controllers are defined in the 'initialize controllers' function.
            // initializeControllers(app);
            // TODO: CSRF    
            app.post('/do/user/login', function(req, res, next) {
                    if (req.body.action === 'Login') {
                        passport.authenticate('local', function(err, user, info) {
                            if (err || !user) {  
                                // TODO: refactor to enum
                                if (err === 'nouser') {
                                    // TODO: populate form with defaults?
                                    // conditional redirect:
                                    // username exists => password is wrong
                                    // username does not exist => register (or prompt register)
                                    return res.redirect('/register.html');
                                } else if (err === 'nopassword') {
                                    // TODO: populate form with defaults?
                                    // conditional redirect:
                                    // username exists => password is wrong
                                    // username does not exist => register (or prompt register)
                                    return res.redirect('/index.html');
                                }
                                return next(err)
                            }
                            req.logIn(user, function(err) {
                                if (err) { 
                                    return next(err); 
                                }
                                return res.redirect('/datasets.html?user=' + user.id);
                            });
                        })(req, res, next)
                    } else if (req.body.action === 'Register') {
                        return res.redirect('/register.html');
                    }    
                }
            );
            
            // TODO: CSRF
            app.post('/do/user/login/google', passport.authenticate('google', { scope: ['profile'] }));

            // DONE
                // except... sending encrypted password over wire on clientside
            app.post('/do/user/register', async (req, res) => {
                const { username, password, email, role, name, organization } = req.body;
                const user = await model.registerUser({ username, password, name, email, role, organization });
                if (user !== null) {

                    // TODO: generate registration token & confirm link
                    const confirmation_token = '';
                    const confirm_link = `${loadedConfig.domain.host}/do/user/confirm?token=${confirmation_token}`;

                    // emailUtils.sendEmail(emailUtils.writeEmailOptions('REGISTERED', {
                    //     name,
                    //     username,
                    //     // the parser can't handle keys with underscores
                    //     confirmlink: confirm_link,
                    // }), context.mail_transporter);

                    emailUtils.sendRegisterConfirmationEmail({
                        name,
                        username,
                        confirmlink: confirm_link, // the parser can't handle keys with underscores
                    }, context.mail_transporter)

                    return res.redirect('/');

                } else {
                    
                    return res.send(304);

                }
            });

            app.post('/do/user/confirm', async (req, res) => {
                const confirm = null;
                if (confirm !== null) {
                    return res.send(200)
                } else {
                    return res.send(304)
                }
            });

            // TODO: CSRF/JWT
            app.post('/do/datasets/register', async (req, res) => {
                
                // This will return in one line
                const makeAccessionId =  (name, len=25) => `${
                    // the order of the following operations matters
                    new String(name)
                        .substr(0, len)
                        .replace(/[.,\/#!$%\^&\*;:{}=\-`~()]/g,"")  // remove all common punctuation characters except for underscore
                        .replace(/ /g, '_')
                        .toUpperCase()
                }_${authUtils.shakeSalt(3)}`;
                
                const accession_id = makeAccessionId(req.body.name);
                
                const dataset = await model.registerDataset({ 
                    accession_id, 
                    ...req.body 
                });
                if (dataset) {
                    return res.redirect('/accession.html?accession_id='+accession_id)
                } else {
                    return res.send(500);
                }

            });
            
            // TODO: gets datasets => post or query params?
            // TODO: CSRF
            app.get('/datasets/:userId', async (req, res) => {
                // TODO: check if logged in user === userId!
                // else unless the role is admin or the dataset is public, don't show
                const datasets = await model.allDatasets({ user_id: req.params.userId });
                if (datasets) {
                    res.send(datasets)
                } else {
                    res.send(404)
                }
            });

            app.get('/datasets/:userId/all', async (req, res) => {
                // TODO: check if logged in user === userId!
                // else unless the role is admin or the dataset is public, don't show
                const user = await model.userExists({ id: req.params.userId })
                if (user) {
                    const datasets = await aggregation.DatasetEntryAggregation.collect({ 
                        user_id: req.params.userId,
                        // organization: results.dataValues.organization
                    });
                    if (datasets) {
                        res.send(datasets)
                    } else {
                        res.send(404)
                    }
                } else {
                    res.send(403)
                }
            });

            // TODO: use querystrings to find arbitrary datasets?
            // ensure session is used to check if authenticated and compatible with role
            // TODO: CSRF
            app.post('/do/query/datasets', async (req, res) => {
                const query = {
                    where: {
                        ...req.body,
                        visible: 1, // visibility access control? visible datasets only
                    }
                }
                const datasets = await model.allDatasets(query);
                // TODO: filter by user permissions!
                if (datasets) {
                    res.send(datasets)
                } else {
                    res.send(404)
                }
            });

            app.post('/do/query/datasets/all', async (req, res) => {
                console.log(req.body)
                const query = {
                    where: {
                        ...req.body,
                        visible: 1, // visibility access control? visible datasets only
                    }
                }

                const datasets = await aggregations.DatasetEntryAggregation.collect(query)
                    .then(a => a.flatMap(i=>i))
                    // .then(a => { console.log('tap', a); return a; })
                    .then(a => a.map(model.helpers.excludeInternalProperties))
                    // .then(a => { console.log('tap', a); return a; });

                // TODO: filter by user permissions!
                if (datasets) {
                    res.send(datasets)
                } else {
                    res.send(404)
                }
            });

            // enum endpoints
            // TODO: CSRF
            app.get('/do/query/datasets/states', async (req, res) => {
                const results = await model.allDatasetStates({ raw: true });
                if (results) {
                    res.setHeader('Content-Type', 'application/json');
                    res.send(results);
                } else {
                    res.send(404)
                }

            });
            // TODO: CSRF
            app.get('/do/query/datasets/datatypes', async (req, res) => {
                const results = await model.allDatasetTypes({ raw: true });
                if (results) {
                    res.send(results);
                } else {
                    res.send(404)
                }
            });
            // TODO: CSRF
            app.get('/do/query/datasets/sources', async (req, res) => {
                const results = await model.allDatasetSources({ raw: true });
                if (results) {
                    res.send(results);
                } else {
                    res.send(404)
                }
            });
            // TODO: CSRF
            app.get('/users/:userId/username', async (req, res) => {
                const results = await model.userExists({ id: req.params.userId })
                if (results) {
                    res.send(JSON.stringify(results.dataValues.username));    
                } else {
                    res.send({});
                }
            });
            // TODO: CSRF
            app.get('/users/:userId/name', async (req, res) => {
                const results = await model.userExists({ id: req.params.userId })
                if (results) {
                    res.send(JSON.stringify(results.dataValues.name));    
                } else {
                    res.send({});
                }
            });
            // TODO: CSRF
            app.get('/users/:userId/organization', async (req, res) => {
                const results = await model.userExists({ id: req.params.userId })
                if (results) {
                    res.send(JSON.stringify(results.dataValues.organization));    
                } else {
                    res.send({});
                }
            });

            // TODO: CSRF
            app.get('/users/roles/', async (req, res) => {
                const results = await model.allUserRoles();
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(results));
            });


            app.post('/do/file/upload/:upload_id/', async (req, res) => {

            });

            app.get('/do/file/upload/progress/:upload_id/', async (req, res) => {

            });

            // INITIALIZE THE SERVER
            const port = loadedConfig.port;
            https.createServer({
                key: fs.readFileSync(`${loadedConfig.https.key}`),
                cert: fs.readFileSync(`${loadedConfig.https.cert}`)
            }, app).listen(port, () => {
                console.log('[HTTPS] App started on port:', port)
            })
            
        
    })
} catch(error) {
    console.error(error)
}





