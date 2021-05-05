const { events } = require('../events');

const nodemailer = require('nodemailer')
const fs = require('fs');
const showdown = require("showdown");
const csvParse = require('csv-parse/lib/sync');

const model = require('./modelUtils');

function makeConverter(content, contentFill) {
    function findTemplateTagsFromContent(content) {
        let regexp = /{{([A-Za-z]+)}}/g;
    
        // we use a slice here because some browsers (firefox) don't support named capture groups in regexp
        // we are able to use a slice here because the structure is always padded by both `{{` and `}}`
        return content ? [...content.matchAll(regexp)].map(m => m[0] ? m[0].slice(2, -2) : "?") : [];
    }
    function makeExtensions(contentFill, valid_tags) {
        let replacements = Object.entries(contentFill || {})
        if (valid_tags) {
            replacements = replacements.filter(fill => valid_tags.includes(fill[0]))
        }
        return replacements.map(filler => ({
            type: "lang",
            regex: `{{${filler[0]}}}`,
            replace: filler[1]
        }));
    }

    const valid_tags = findTemplateTagsFromContent(content);
    const fill_extensions = makeExtensions(contentFill, valid_tags);
    const converter = new showdown.Converter({
        extensions: [
            ...fill_extensions,
        ]
    });

    return converter;
}

function getEmail(messageType) {
    try {
        fs.accessSync(`templates/${messageType}.md`);
        const emailTemplate = fs.readFileSync(`templates/${messageType}.md`).toString();
        return emailTemplate;
    } catch {
        console.error(`file for ${messageType} doesn't exist or can't be accessed`);
    }
    return '';
}

function getEmailBodyToHTML(emailText, params) {
    // TODO: check if params are in the schema?
    return makeConverter(emailText, params).makeHtml(emailText);
}

let contacts = csvParse(fs.readFileSync('contacts/contacts.csv', 'utf-8').toString(), {
    columns: true,
    skip_empty_lines: true
})

function getTo() {
    return contacts.filter(contact => contact.role === 'researcher').map(contact => contact.email);
}
function getFrom() {
    return contacts.filter(contact => contact.role === 'admin').map(contact => contact.email)[0];
}

function setEmailOptions(emailSubject, emailContent, contactsRecieving=getTo(), contactsSending=getFrom()) {
    let mailOptions = {}; 

    // YAML Config?
    mailOptions.to = contactsRecieving;   // TODO
    mailOptions.from = contactsSending; // TODO
    mailOptions.subject = emailSubject;
    mailOptions.html = emailContent;

    return mailOptions;
}

// TODO: replace with database transaction!
// TODO: use the ORM!
// Why? Because reduplicating the vents over and over is not sustainable
// Each event needs to have an f-key to the data for system behavior in different locations
// Else this whole enum business fails
// Doing everything locally is a stopgap!
function getEmailSubject(type) {
    const emailSubjects = {
        // link wrapping emails
        [events.links.ACCESSED]: `Dataset has been successfully accessed.`,
        [events.links.REMINDER]: `You have X days to download this dataset. Would you like to download this dataset?`,
        // transfer emails
        [events.transfers.UPLOAD_REQUESTED]: `An upload has been requested.`,
        [events.transfers.UPLOAD_START]: `Upload started for dataset`,
        [events.transfers.UPLOAD_ERROR]: `Upload error for dataset`,
        [events.transfers.UPLOAD_SUCCESS]: `Upload successful for dataset`,
        [events.transfers.DOWNLOAD_START]: `Dataset is being downloaded`,
        [events.transfers.DOWNLOAD_SUCCESS]: `Successful download for dataset`,
        [events.transfers.DOWNLOAD_ERROR]: `Error in download for dataset`,
        // user account emails
        [events.accounts.REGISTERED]: `Confirmation of registration`,
        [events.accounts.REGISTERED_ADMIN]: `Confirmation new user registration`
    }
    return emailSubjects[type];
}

function writeEmailOptions(type, contentFill, broadcastTo) {
    const emailTemplate = getEmail(type);
    if (emailTemplate !== '') {
        const emailContent = getEmailBodyToHTML(emailTemplate, contentFill);
        const emailSubject = getEmailSubject(type);
        const emailOptions = setEmailOptions(emailSubject, emailContent, broadcastTo);
        return emailOptions;
    }
    return {};
}

async function makeTestEmailTransporter() {
    // Generate test SMTP service account from ethereal.email
    // Only needed if you don't have a real mail account for testing
    let testAccount = await nodemailer.createTestAccount();
  
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });
    return transporter
}

async function sendEmail(emailOptions, transporter) {
    let _transporter = transporter;
    if (!!!_transporter) {
        _transporter = await makeTestEmailTransporter();
    }

    // send mail with defined transport object
    let info = await _transporter.sendMail(emailOptions);
  
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
    console.log("Message sent: %s", info.messageId);
  
    // Preview only available when sending through an Ethereal account
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}

async function sendRegisterConfirmationEmail(params, transporter) {
    const administrators = await model.allUsers({ role: 'internal' });
    const emails = administrators.map(administrator => administrator.email);
    const emailOptions = writeEmailOptions('REGISTERED_ADMIN', params, emails);
    console.log(administrators, emails, emailOptions)

    return await sendEmail(emailOptions, transporter);
}

module.exports = {
    makeTestEmailTransporter,
    writeEmailOptions,
    sendEmail,
    sendRegisterConfirmationEmail,
}