const { Sequelize, Model, DataTypes } = require('sequelize');
const sequelize = new Sequelize('sqlite::memory:');

const schemaDataset = {
    dataset_name: DataTypes.STRING,
    dataset_ids: DataTypes.STRING
}
class Dataset extends Model {}
Dataset.init(schemaDataset, { sequelize, modelName: 'dataset' });

const schemaUsers = {
    username: DataTypes.STRING,
    role: DataTypes.STRING
}
class User extends Model {}
User.init(schemaUsers, { sequelize, modelName: 'user' });
User.hasMany(Dataset)

const schemaDatasetStatus = {
    d1: {
        type: DataTypes.DATE,
        allowNull: true,
    }, // D: 1. Compliance documentation complete	
    d2: {
        type: DataTypes.DATE,
        allowNull: true,
    }, // D: 2. Data transferred to DCC	
    d3: {
        type: DataTypes.DATE,
        allowNull: true,
    }, // D: 3. Data inventoried and securely stored at DCC	
    d4: {
        type: DataTypes.DATE,
        allowNull: true,
    }, // D: 4. Individual level data QC started	
    d5: {
        type: DataTypes.DATE,
        allowNull: true,
    }, // D: 5. Individual level data QC under review by collaborator	
    d6: {
        type: DataTypes.DATE,
        allowNull: true,
    }, // D: 6. Individual level analysis started	
    d7: {
        type: DataTypes.DATE,
        allowNull: true,
    }, // D: 7. Individual level analysis under review by collaborator	
    d8: {
        type: DataTypes.DATE,
        allowNull: true,
    }, // D: 8. Data loaded to the knowledge base	
    d9: {
        type: DataTypes.DATE,
        allowNull: true,
    }, // D: 9. Data available in QA portal for review	
    d10: {
        type: DataTypes.DATE,
        allowNull: true,
    }, // D: 10. Data live in portal
}
class DatasetStatus extends Model {}
DatasetStatus.init(schemaDatasetStatus, { sequelize, modelName: 'dataset_status' });
DatasetStatus.belongsTo(Dataset)

const schemaDatasetAnnotation = {
    status: DataTypes.STRING, // can i link this to an enum type
    pi: DataTypes.STRING,
    institution: DataTypes.STRING,
    timeline: DataTypes.DATE,
    notes: DataTypes.TEXT,
    discussion: DataTypes.TEXT
}
class DatasetAnnotations extends Model {}
DatasetAnnotations.init(schemaDatasetAnnotation, { sequelize, modelName: 'dataset_annotation' });
DatasetAnnotations.belongsTo(Dataset)

const schemaDatasetReports = {
    qc: DataTypes.STRING,
    analysis: DataTypes.STRING,
}
class DatasetReports extends Model {}
DatasetReports.init(schemaDatasetReports, { sequelize, modelName: 'dataset_reports' });
DatasetReports.belongsTo(Dataset)

class UploadRequest extends Model {}
const schemaUploadRequest = {
    type: DataTypes.STRING,
    address: DataTypes.STRING,
    auth: DataTypes.STRING,
}
UploadRequest.init(schemaUploadRequest, { sequelize, modelName: 'upload_request' });
// is this true?
Dataset.hasOne(UploadRequest)

// get users
// get users by role
// add users
    // username
    // password
    // contact email
    // role

// add datasets
    // name
    // file
async function createDataset(dataset_name, dataset_ids) {
    const transaction = await Dataset.create({
        dataset_name,
        dataset_ids
    })
    return transaction;
}

// see dataset statuses (enum)
// see dataset stages (enum)

// see all datasets
// query datasets by annotations
// progress status of dataset
// reneg status of dataset
// set dataset properties

// upload files for a dataset
    // goal: 
    // force consistency of dataset metadata with file downloads
    // keep track of at what stage a download is at
    // setup reminders for different download related steps

    // request upload link (if Aspera)
        // prerequisite: X of role N has uploaded and registered all important dataset details
            // `createDataset`
        // upload link is requested, with email from X of role N to Y of role M
            // `requestUpload`
            async function requestUpload(dataset) {
                // an upload request takes a dataset and returns a transaction
                    // side effects:
                    // these should exist at response level
                        // people are informed that the upload request exists
            }
        // Y of role M retrieves download link/credentials from <BITS>
            // <outside system>
            // would need input validation?
        // Y of role M submits download link/credentials to open download link to system
            // form is polymorphic depending on request
        // system mails url-shortened link OR to page with link and download instructions
        // X of role N clicks the link to setup the uploading process
        // Y of role M is informed that the uploading process is started

    // M is an admin role, N is an uploader role

    module.exports = {
        requestUpload
    }


    // add users with roles

// get users
// get users by role
// add users
    // username
    // password
    // contact email
    // role

// add datasets
    // name
    // file
  
  // see dataset statuses (enum)
  // see dataset stages (enum)
  
  // see all datasets
  // query datasets by annotations
  // progress status of dataset
  // reneg status of dataset
  // set dataset properties
  
  // see all upload requests
  // query for uplod request by dataset issues
  
  // upload files for a dataset
      // goal: 
      // force consistency of dataset metadata with file downloads
      // keep track of at what stage a download is at
      // setup reminders for different download related steps
  
// request upload link (if Aspera)
    // prerequisite: X of role N has uploaded and registered all important dataset details
        // `createDataset`
    // upload link is requested, with email from X of role N to Y of role M
    // Y of role M retrieves download link/credentials from <BITS>
        // <outside system>
        // would need input validation?
    // Y of role M submits download link/credentials to open download link to system
        // form is polymorphic depending on request
    // system mails url-shortened link OR to page with link and download instructions
    // X of role N clicks the link to setup the uploading process
    // Y of role M is informed that the uploading process is started
      
// M is an admin role, N is an uploader role
