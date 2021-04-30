const { events } = require('../../events');

const { Sequelize, Model, DataTypes } = require('sequelize');
const sequelize = new Sequelize('sqlite::memory:');

const schemaDatasetUploadRequest = {
    name: DataTypes.STRING,
    version: {
        type: DataTypes.NUMBER,  // increment of upload version?
        defaultValue: 0
    },
    lastUpdated: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },  // ensure this is correct format at DB or client level?
    aspera: DataTypes.STRING,
    link: DataTypes.STRING,
    deadline: DataTypes.DATE,
    author: DataTypes.STRING,
    status: DataTypes.ENUM(Object.values(events.transfers)),
}
class DatasetUploadRequest extends Model {}
DatasetUploadRequest.init(schemaDatasetUploadRequest, { sequelize, modelName: 'dataset_uploads' })

async function initDB() {
    await DatasetUploadRequest.sync();    
}

async function putDatasetUploadRequestStatusChange(status, params) {
    console.log('using put with', status, params)
    const [datasetUploadRequest, created] = await DatasetUploadRequest.findOrCreate({
        where: { ...params },
    })
    // process status
    if (datasetUploadRequest.get('status') !== status) {
        console.log('updating status')
        await DatasetUploadRequest.update({ 
            status
        }, { where: { ...params } });
    }
    if (status === events.transfers.UPLOAD_REQUESTED) {
        console.log('incrementing version')
        await DatasetUploadRequest.update({ 
            version: datasetUploadRequest.version + 1,
        }, { where: { ...params } });
    }
}
async function getDatasetUploadRequest(properties) {
    return await DatasetUploadRequest.findOne({
        where: { ...properties }
    });
}

module.exports = {
    initDB,
    putDatasetUploadRequestStatusChange,
    getDatasetUploadRequest,
}