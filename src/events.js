module.exports = {
    events: Object.freeze({
        links: {
            ACCESSED: 'ACCESSED',
            REMINDER: 'REMINDER'
        },
        transfers: {
            UPLOAD_REQUESTED: 'UPLOAD_REQUESTED',
            UPLOAD_START: 'UPLOAD_START',
            UPLOAD_SUCCESS: 'UPLOAD_SUCCESS',
            UPLOAD_ERROR: 'UPLOAD_ERROR',
            DOWNLOAD_START: 'DOWNLOAD_START',
            DOWNLOAD_SUCCESS: 'DOWNLOAD_SUCCESS',
            DOWNLOAD_ERROR: 'DOWNLOAD_ERROR',
        },
        accounts: {
            REGISTERED: 'REGISTERED',
            REGISTERED_ADMIN: 'REGISTERED_ADMIN'
        }
    })
}