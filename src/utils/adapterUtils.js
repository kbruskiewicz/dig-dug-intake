const model = require('./modelUtils');
const fetch = require("node-fetch");
const old_data = require('../data/old_data');

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

const schemaCheck = (properties) => (object) => {
    // Check if function has all the properties 
    // Useful for assuring that objects satisfy a schema at runtime
    // Applications include making sure functions that modify properties of an object conform to a schema,
    //  or assuring that an object has all the properties we want of it before using it.
    // It is a stopgap measure over using Typescript within a codebase.

    // Array<String> => Object => id(Object) | null;  // treat null as a fals-y value
    // Throws exceptions

    // Use as HOF
    // * schemaCheck(['name', 'source', 'workflow', 'status', 'location'])                                                                  // return function: Object => id(Object) | null
    // * schemaCheck(['name', 'source', 'workflow', 'status', 'location'])({ name, source, workflow, status, location });                   // PASS
    // * schemaCheck(['name', 'source', 'workflow', 'status', 'location'])({ name, source, workflow, status, location, embargo_date });     // PASS (redundant properties are allowed)
    // * schemaCheck(['name', 'source', 'workflow', 'status', 'location'])({ name, source });                                               // FAIL (all given properties are necessary)

    // Combine with keys of schema objects to make a schema-checking function (upto the property existence, excluding value types)
    // Useful for adapters/translating functions:
    // const isDatasetEntry = schemaCheck(Object.keys(model.schemas.datasetSchema));
    // * isDatasetEntry({ accession_id, user_id, name, organization, principal_investigator, description, provider, source, state, datatype, embargo_date })    // PASS

    // TODO: ASSUMES ALL OPTIONAL PROPERTIES CONSUMED?

    try {
        properties.forEach(property => {
            assert(object.hasOwnProperty(property), `schemaCheck: Object does not have property ${property}, object: ${object.toString()}`)
        });
        return object;
    } catch (error) {
        console.error(error);
        return null;
    }
}

const adapt = reshaper => objects => objects.map(reshaper);
const filterEntries = filter => entries => entries.filter(entry => {
    if (!!filter.where) {
        return Object.entries(filter.where).every(filterEntry => {
            const [key, value] = filterEntry;
            return entry[key] === value;
        })
    } else {
        console.warn("the filter given to the adapter doesn't have a `where` clause")
        return entries;
    }
});

// const isDatasetEntry = schemaCheck(Object.keys(model.schemas.datasetSchema))
const isDatasetEntry = schemaCheck([
    'name',
    'source',
    'workflow',
    'status',
    'location',
    'datatype',
    'organization',
    'description'
]);

const oldDataAdapter = filter => new Promise(res => res(adapt(el => isDatasetEntry({
    name: el['Dataset Name'],
    portal: el.portal,
    principal_investigator: el['PI/Contact'],
    status: el['Status'],
    description: el['Notes'],
    location: el['Location'],
    source: '',
    workflow: '',
    datatype: '',
    organization: '',
    // 'Dataset Name': 'Late-onset Alzheimer’s (PMID: 30820047)',
    // 'PI/Contact': 'Kunkle',
    // 'Summary/Individual level ': 'Summary',
    // 'Need / Urgency': '',
    // Notes: 'PMID: 30820047'
}))((function() {
    new_data = [];
    console.log(old_data.data)
    Object.entries(old_data.data).forEach(el => {
        const [portal, schemas] = el;
        console.log([portal, schemas])
        schemas.datasets.forEach(datasetEntry => {
            console.log(datasetEntry)
            new_data.push({
                portal,
                ...datasetEntry
            })
        })
    })
    return new_data;
})())))

const dgaAnnotations = (filter) => fetch(
        'http://www.diabetesepigenome.org:8080/getAnnotation', {
            method: "POST",
            body: JSON.stringify({ type: 'Annotation' })
        })
    .then(result => result.json())
    .then((responseBody) => {

        // TODO: Json Query
        const parsedResponse = Object.entries(responseBody)[0][1];

        // TODO: it should be feasible to turn this into a spec driven construct?
        /*
        Consider a yaml file:

        ```yaml
        remote_datasource:
            # keys here are names
            dga_annotations:
                url: 'http://www.diabetesepigenome.org:8080/getAnnotationRegistry'
                body: "{ type: 'Annotation' }"   # possible make a yaml object as well?
                adapt:
                    schema: 'datasetEntry'
                    translation:
                        # keys here would be iterated on for a remapping function
                        workflow: 'underlying_assay'
                            # type properties optional
                            type: 'array'
                        accession_id: 'annotation_id'
                        name: 'tissue_id'
                        location: 'DGA'
                            # use this to treat the string value as a literal, not key
                            force: True
        ```

        We could be even more presumptive about how we parse the configuration to make it more terse:

        ```yaml
       
        dataset_entry:                                    # in the file, root keys are schemas                            
            dga_annotations:                              # child keys are remote datasource names
                url: 'http://www.diabetesepigenome.org:8080/getAnnotationRegistry'
                body: 
                    type: 'Annotation'                    # treated as keys in JSON body
                translate:
                    workflow: 'underlying_assay'
                    accession_id: 'annotation_id'
                    # etc
                provide:
                    # instead of using 'force'
                    location: 'DGA'
        ```

        The goal is to make it much easier in the long run to add remote datasources.
        It should be able to be handled familiar with the datasets, BUT not the code.

        BUT we have some problems of making sure the data that does get returned is an array of objects.

        */

        // translation function
        const datasetEntries = adapt(o => isDatasetEntry({
            accession_id: o.annotation_id,
            description: `${o.portal_tissue_id}`,
            organization: 'DGA',
            name: `${o.portal_tissue}`,
            source: o.annotation_source,
            workflow: `${o.underlying_assay}`, // TODO: array value? turn into string
            status: o.dataset_status, // TODO: map into our own status codes for dataset status?
            datatype: 'annotation',
            location: `diabetesgenome.org`, // TODO: how to link into DGA resource to see the result?
            principal_investigator: o.lab,
            visible: 1 // truthy, if we're seeing it here we're supposed to see it because the datasource is public
        }))(parsedResponse);

        return datasetEntries;

    }).then(filterEntries(filter))

module.exports = {
    oldDataAdapter,
    dgaAnnotations,
    isDatasetEntry,
}
