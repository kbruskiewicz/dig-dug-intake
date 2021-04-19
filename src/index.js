const { Sequelize, Model, DataTypes } = require('sequelize');
const sequelize = new Sequelize('sqlite::memory:');

/*
const schemaIntake = {
    // actor list
    U: Username	
    P: Password	
    R: Role	

    // dataset list
    DT: Dataset Name	
    DI: Dataset IDs	
    
    // Dataset annotations
    H: Status   // how does this work with D1?
    H: PI	
    H: Where it is coming from	
    N: Notes	
    H: Need / Urgency	
    H: Discussion points

    // Individual/summary flag
    SOI: Summary or Ind level data workflow	

    // portal state
    D: 1. Compliance documentation complete	    // how does this work with H: Status?
    D: 2. Data transferred to DCC	
    D: 3. Data inventoried and securely stored at DCC	
    D: 4. Individual level data QC started	
    D: 5. Individual level data QC under review by collaborator	
    D: 6. Individual level analysis started	
    D: 7. Individual level analysis under review by collaborator	
    D: 8. Data loaded to the knowledge base	
    D: 9. Data available in QA portal for review	
    D: 10. Data live in portal	QCRPS: QC reports	

    ARRPS: Analysis reports								
}
*/

const schemaUsers = {
    username: DataTypes.STRING,	
    passwrord: DataTypes.STRING,	
    role: DataTypes.STRING
}

const schemaDatasetAnnotations = {
    status: DataTypes.STRING, // how does this work with D1?
    pi: DataTypes.STRING,
    notes: DataTypes.TEXT,
    urgency: DataTypes.STRING,
    source: DataTypes.STRING,
    discussion: DataTypes.TEXT,
}

const schemaDatasets = {
    datasetId: DataTypes.STRING,
    datasetName: DataTypes.STRING,
}

const schemaDatasetStates = {
    // portal state
    // D: 1. Compliance documentation complete	    // how does this work with H: Status?
    // D: 2. Data transferred to DCC	
    // D: 3. Data inventoried and securely stored at DCC	
    // D: 4. Individual level data QC started	
    // D: 5. Individual level data QC under review by collaborator	
    // D: 6. Individual level analysis started	
    // D: 7. Individual level analysis under review by collaborator	
    // D: 8. Data loaded to the knowledge base	
    // D: 9. Data available in QA portal for review	
    // D: 10. Data live in portal	QCRPS: QC reports	
    d1: DataTypes.DATE,
    d2: DataTypes.DATE,
    d3: DataTypes.DATE,
    d4: DataTypes.DATE,
    d5: DataTypes.DATE,
    d6: DataTypes.DATE,
    d7: DataTypes.DATE,
    d8: DataTypes.DATE,
    d9: DataTypes.DATE,
    d10: DataTypes.DATE,
}

const schemaAnalysis = {
    analysisReports: DataTypes.STRING,
}

const schemaIntake = {
    ...schemaUsers,
    ...schemaDatasets,
    ...schemaDatasetAnnotations,
    ...schemaDatasetStates,
    ...schemaAnalysis
}

class DatasetIntake extends Model {}
DatasetIntake.init(schemaIntake, { sequelize, modelName: 'user' });

(async () => {
    await sequelize.sync();
    const jane = await DatasetIntake.create({
    username: 'janedoe',
    });
    console.log(jane.toJSON());
})();

// class User extends Model {}
// User.init({
//   username: DataTypes.STRING,
//   birthday: DataTypes.DATE
// }, { sequelize, modelName: 'user' });

(async () => {
    await sequelize.sync();
    const jane = await User.create({
        username: 'janedoe',
        birthday: new Date(1980, 6, 20)
    });
    console.log(jane.toJSON());
})();

// const TodoItem = Vue.component('todo-item', {
//     template: '<li>This is a todo</li>'
// })
  
// var app = new Vue({
//     el: '#app',
//     components: {
//         TodoItem,
//     }
// })
