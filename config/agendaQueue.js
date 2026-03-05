module.exports.agendaQueue = {
    jobs: [
        {
            name: 'SolrSearchService-CreateOrUpdateIndex',
            fnName: 'solrsearchservice.solrAddOrUpdate',
            options: {
                lockLifetime: 3 * 1000, // 3 seconds max runtime
                lockLimit: 10,
                concurrency: 10
            }
        },
        {
            name: 'SolrSearchService-DeleteFromIndex',
            fnName: 'solrsearchservice.solrDelete',
            options: {
                lockLifetime: 3 * 1000, // 3 seconds max runtime
                lockLimit: 10,
                concurrency: 10
            }
        },
        {
            name: 'RecordsService-StoreRecordAudit',
            fnName: 'recordsservice.storeRecordAudit',
            options: {
                lockLifetime: 30 * 1000,
                lockLimit: 10,
                concurrency: 10
            }
        },
        {
            name: 'RaidMintRetryJob',
            fnName: 'raidservice.mintRetryJob'
        },
        {
            name: 'PDFService-CreatePDF',
            fnName: 'rdmpservice.queuedTriggerSubscriptionHandler',
            options: {
                lockLifetime: 120 * 1000, // 120 seconds max runtime
                lockLimit: 1,
                concurrency: 1
            }
        },
    ]
};
