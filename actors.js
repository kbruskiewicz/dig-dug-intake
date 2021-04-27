const { sendEmail, writeEmailOptions } = require('./utils/emailUtils');
const { initDB, getDatasetUploadRequest, putDatasetUploadRequestStatusChange } = require('./utils/modelUtils');
const { events } = require('./events');

const { start, dispatch, stop, spawnStateless, spawn } = require('nact');

// Overarching Actor System
const system = start();

const mailer = spawnStateless(
    system,
    async (msg, ctx) => {
        console.log(`Hello from email with ${msg.status}`)
        const emailOptions = writeEmailOptions(msg.status, msg.params);
        await sendEmail(emailOptions).catch(console.error);
    },
    'mailer'
);

const logger = spawnStateless(
    system,
    async (msg, ctx) => {
        console.log(`Hello from logger with ${msg.status}`)
        // TODO: map to stdout/redis?
        // TODO: parse structure?
        // Logger.info
        console.log(Date.now(), msg);
    },
    'logger'
);

// TODO: Dangerous! to have an event loop like this (can result in infinite emails!)
// Wish I knew TLA+ right now...
const reminder = spawnStateless(
    system,
    async (msg, ctx) => {
        // TODO: wait a certain amount of time
        // THEN check state
        // THEN dispatch message based on diff in state
        dispatch(mailer, msg);
    },
    'reminder'
);

const timer = spawn(
    system,
    async (msg, ctx={}) => {

    },
    'timer'
)

const broker = spawnStateless(
    system,
    async (msg, ctx) => {
        
        console.log(`Hello from broker with ${msg.status}`)
        // put -> create or update a dataset upload request with new state change
        await putDatasetUploadRequestStatusChange(msg.status, msg.params).catch(console.error);
        // get the resulting dataset request that fulfilled the params provided
        const datasetUploadRequest = await getDatasetUploadRequest(msg.params);

        // override params with the full version (populated with schema defaults if necessary)
        const fullUploadRequestMessage = { ...msg, params: datasetUploadRequest.toJSON() };
        // broadcast to notifier actors
        // TODO: broadcast to actor hierarchy to encapsulate both messaging styles?
        dispatch(logger, fullUploadRequestMessage);
        dispatch(mailer, fullUploadRequestMessage);

        // setup a reminder service with the state within "deadline"
        // dispatcher(reminder, fullUploadRequestMessage)

        // return the foreign key of the datasetUploadRequest being toyed with
        return datasetUploadRequest.get('id');

    },
    'broker'
);

(async function main() {
    await initDB();
    dispatch(broker, { 
        status: events.transfers.UPLOAD_REQUESTED, 
        params: {
            name: 'T2D',
            author: 'Arthur',
        } 
    });

    dispatch(broker, { 
        status: events.transfers.UPLOAD_START, 
        params: {
            name: 'T2D',
        } 
    });
})()

