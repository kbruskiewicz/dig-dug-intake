const config = require("../../config");
const loadedConfig = config.loadConfig();

const authUtils = require("./authUtils")
const merge = require("lodash.merge")
const { events } = require('../events');
const { Sequelize, Model, DataTypes } = require('sequelize');

let sequelize = null;
function initDB() {
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
    return sequelize;
}
initDB();

// const schemaDatasetUploadRequest = {
//     name: DataTypes.STRING,
//     version: {
//         type: DataTypes.NUMBER,  // increment of upload version?
//         defaultValue: 0
//     },
//     lastUpdated: {
//         type: DataTypes.DATE,
//         defaultValue: DataTypes.NOW,
//     },  // ensure this is correct format at DB or client level?
//     aspera: DataTypes.STRING,
//     link: DataTypes.STRING,
//     deadline: DataTypes.DATE,
//     author: DataTypes.STRING,
//     status: DataTypes.ENUM(Object.values(events.transfers)),
// }
// class DatasetUploadRequest extends Model {}
// DatasetUploadRequest.init(schemaDatasetUploadRequest, { sequelize, modelName: 'dataset_uploads' })

// async function initDB() {
//     await DatasetUploadRequest.sync();    
// }

// async function putDatasetUploadRequestStatusChange(status, params) {
//     console.log('using put with', status, params)
//     const [datasetUploadRequest, created] = await DatasetUploadRequest.findOrCreate({
//         where: { ...params },
//     })
//     // process status
//     if (datasetUploadRequest.get('status') !== status) {
//         console.log('updating status')
//         await DatasetUploadRequest.update({ 
//             status
//         }, { where: { ...params } });
//     }
//     if (status === events.transfers.UPLOAD_REQUESTED) {
//         console.log('incrementing version')
//         await DatasetUploadRequest.update({ 
//             version: datasetUploadRequest.version + 1,
//         }, { where: { ...params } });
//     }
// }
// async function getDatasetUploadRequest(properties) {
//     return await DatasetUploadRequest.findOne({
//         where: { ...properties }
//     });
// }

// an enum class
function initEnumClass(sequelize, SequelizeModel, modelName, prop='name') {
    SequelizeModel.init({ [prop]: { type: DataTypes.STRING, defaultValue: '' } }, { sequelize, modelName, timestamps: false })
}

function allOf(SequelizeModel) {
    return async args => {
        const datapoints = await SequelizeModel.findAll({ ...args, raw: true });
        return datapoints;
    };
}

class UserRole extends Model {}
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
    name: {
        type: DataTypes.STRING,
    },
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
    },

    // useful metadata
    googleId: {
        type: DataTypes.STRING,
        defaultValue: '',
    },
    confirmed: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    }

}, { sequelize, modelName: 'user' });

async function userExists(query) {
    return await User.findOne({ where: query })
}

async function registerUser(username, password, name, email, role, salt=authUtils.shakeSalt(), hash_function=loadedConfig.crypto.hash_implementation) {
    // TODO: guarantee that user IDs are UUIDs
    // should be generated in SQL
    if (!(await userExists({ username }))) {
        const user = await User.create({
            username: username,
            name: name,
            password_salt: salt,
            password_hash: authUtils.obscurePassword(password, hash_function, salt),
            hash_function: hash_function,
            email,
            role,
        });
        return user;
    } else {
        return null;
    }
}

class DatasetState extends Model {}
// DatasetState.init({ state: { type: DataTypes.STRING, defaultValue: '' } }, { sequelize, modelName: 'dataset_state' });
initEnumClass(sequelize, DatasetState, 'dataset_state', 'state');

class DatasetSource extends Model {}
// DatasetSource.init({ source:  { type: DataTypes.STRING, defaultValue: '' }  }, { sequelize, modelName: 'dataset_source' });
initEnumClass(sequelize, DatasetSource, 'dataset_source', 'source');

class DatasetType extends Model {}
// DatasetType.init({ type:  { type: DataTypes.STRING, defaultValue: '' }  }, { sequelize, modelName: 'dataset_type' });
initEnumClass(sequelize, DatasetType, 'dataset_type', 'type');


class Dataset extends Model {}
const datasetSchema = {
    // database mechanics
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
    provider: {
        type: DataTypes.STRING,
        defaultValue: '',
    },
    principal_investigator: {
        type: DataTypes.STRING,
        defaultValue: '',
    },
    description: {
        type: DataTypes.TEXT,
        defaultValue: ''
    },
    workflow: {
            // TODO: sources - how to generate them programatically? => reference another table => convert to FKEYS
            type: DataTypes.STRING,
            defaultValue: '', 
    },
    source: {
        // TODO: sources - how to generate them programatically? => reference another table => convert to FKEYS
        type: DataTypes.STRING,
        defaultValue: '',
    },
    status: {
        // TODO: states - how to generate them programatically? => reference another table => convert to FKEYS
        type: DataTypes.STRING,
        defaultValue: '',
    },
    datatype: {
        // TODO: states - how to generate them programatically? => reference another table => convert to FKEYS
        type: DataTypes.STRING,
        defaultValue: '',
    },

    embargo_date: DataTypes.DATE,

    // e.g. Terra Bucket
    location: {
        type: DataTypes.STRING,
        defaultValue: ''
    },

    visible: {
        type: DataTypes.NUMBER,
        defaultValue: 1,
    }

};
Dataset.init(datasetSchema, { sequelize, modelName: 'datasets' })

    // this is a specially implemented call for getting datasets because they have specific visibility constraints
    // function allDatasets(query) {
    //     // going to restrict the datasets to only those considered globally visible?
    //     return async args => await Dataset.findAll(merge({ where: { visible: 1 }}), args);
    // }

async function registerDataset({ accession_id, user_id, name, institution, description, provider, principal_investigator, source, status, datatype, embargo_date }) {   
    const datasetExists = await Dataset.findOne({ where: { accession_id } }) !== null;
    if (!datasetExists) {
        const dataset = await Dataset.create({
            accession_id,
            user_id,
            // accessions should either be generated here or within SQL
            // only constraint is that it must be a file-system compatible string (SO: keep it alphanumeric)
            name,
            institution,
            principal_investigator, 
            description, provider, 
            source,
            datatype,
            embargo_date,
            status: 0,  // all datasets are initialized in state 0
        });
        return dataset;
    } else {
        return null;
    }
}

// Our database schemas come with many "internal properties", like ID, user_id, createdAt, and updatedAt
// Most users don't have to see this when the data is displayed, instead they're 
// We document these internal properties so that they can be filtered or sampled later
const _internalProperties = [
    'id', 'user_id', 'createdAt', 'updatedAt', 
    'visible',

    'provider',
    'principal_investigator',
    'embargo_date',	
];

const excludeProperties = (properties) => (object) => {
    let _object = object;
    properties.forEach(property => {
        _object[property] = undefined;
    })
    return _object;
}

const excludeInternalProperties = object => {
    return excludeProperties(_internalProperties)(object)
}

// enrichWithProperties
// * Used to ensure that an object has properties, even if they are null (NOT undefined)
// * Works by creating an object with keys from a list initialized with empty values. 
//   Then override all the empty values with full ones from a given object.
const enrichWithProperties = properties => (object) => {
    let propertyMap = properties.reduce((acc, property) => { acc[property] = null; return acc; }, {});
    return {
        ...propertyMap,
        ...object,
    }
}

// enrichWithInternalProperties
// * Give an object that doesn't have all of the internal properties, internal properties.
const enrichWithInternalProperties = object => {
    return enrichWithProperties(_internalProperties)(object);
}

const enrichWithDatasetProperties = object => {
    return enrichWithProperties(Object.keys(datasetSchema))(object);
}

module.exports = {
    initDB,
    userExists,
    registerUser,
    registerDataset,
    allUsers: allOf(User),
    allUserRoles: allOf(UserRole),
    allDatasetStates: allOf(DatasetState),
    allDatasetSources: allOf(DatasetSource),
    allDatasetTypes: allOf(DatasetType),
    allDatasets: allOf(Dataset),
    schemas: {
        datasetSchema
    },
    helpers: {
        excludeInternalProperties,
        enrichWithInternalProperties,
        enrichWithDatasetProperties,
    }
}