module.exports.recordtype = {
  // overwriting... use the value in this file, rather than merge
  '_dontMerge': ['rdmp'],
  "rdmp": {
    "packageType": "rdmp",
    hooks: {
      onCreate: {
        pre: [
          {
            function: 'sails.services.rdmpservice.assignPermissions',
            options: {
              "emailProperty": "email",
              "editContributorProperties": [
                "metadata.contributor_ci",
                "metadata.contributor_data_manager",
                "metadata.dataowner_email"
              ],
              "viewContributorProperties": [
                "metadata.contributor_ci",
                "metadata.contributor_data_manager",
                "metadata.contributor_supervisor",
                "metadata.contributors"
              ],
              "recordCreatorPermissions": "view&edit"
            }
          },
        ],
        // Requires the PDF Gen hook to be installed https://www.npmjs.com/package/@researchdatabox/sails-hook-redbox-pdfgen
        post: [
          {
            function: 'sails.services.rdmpservice.queueTriggerCall',
            options: {
              jobName: 'PDFService-CreatePDF',
              triggerConfiguration: {
                function: 'sails.services.pdfservice.createPDF',
                options: {
                  waitForSelector: 'div#loading.hidden',
                  pdfPrefix: 'rdmp-pdf',
                  // Need to set an API token for generation to occur, will be injected via hook's index.js
                  token: ''
                }
              }
            }
          },
        ]
      },
      onUpdate: {
        pre: [
          {
            function: 'sails.services.rdmpservice.assignPermissions',
            options: {
              "emailProperty": "email",
              "editContributorProperties": [
                "metadata.contributor_ci",
                "metadata.contributor_data_manager",
                "metadata.dataowner_email"
              ],
              "viewContributorProperties": [
                "metadata.contributor_ci",
                "metadata.contributor_data_manager",
                "metadata.contributor_supervisor",
                "metadata.contributors"
              ],
              "recordCreatorPermissions": "view&edit"
            }
          },
          {
            function: 'sails.services.rdmpservice.checkTotalSizeOfFilesInRecord',
            options: {
              triggerCondition: '<%= _.isEqual(record.workflow.stage, "draft") || _.isEqual(record.workflow.stage, "queued") || _.isEqual(record.workflow.stage, "published") %>',
              maxUploadSizeMessageCode: 'max-total-files-upload-size-alternative-validation-error',
              replaceOrAppend: 'append'
            }
          },
        ],
        // Requires the PDF Gen hook to be installed https://www.npmjs.com/package/@researchdatabox/sails-hook-redbox-pdfgen
        post: [
          {
            function: 'sails.services.rdmpservice.queueTriggerCall',
            options: {
              jobName: 'PDFService-CreatePDF',
              triggerConfiguration: {
                function: 'sails.services.pdfservice.createPDF',
                options: {
                  waitForSelector: 'div#loading.hidden',
                  pdfPrefix: 'rdmp-pdf',
                  // Need to set an API token for generation to occur, will be injected via hook's index.js
                  token: ''
                }
              }
            }
          }
        ]
      }
    },
    relatedTo: [
      {
        "recordType": "dataRecord",
        "foreignField": "metadata.rdmp.oid"
      }
    ],
    transferResponsibility: {
      /*
        Defines the fields that map to roles in the record
      */
      fields: {
        chiefInvestigator: {
          label: "@dmpt-people-tab-ci", // The label to show in the radio button options
          updateField: "contributor_ci",
          updateAlso: ['dataOwner']
        },
        dataManager: {
          label: "@dmpt-people-tab-data-manager", // The label to show in the radio button options
          updateField: 'contributor_data_manager'
        },
        dataOwner: {
          label: "@dmpt-people-tab-data-owner", // The label to show in the radio button options
          fieldNames: {
            email: "dataowner_email", // The email address field in the form, used for matching as well
            text_full_name: "dataowner_name" // The name field in the form
          }
        }
      },
      /*
        canEdit block defines which fields the user may edit if
        they have been set as that role in the record
      */
      canEdit: {
        dataManager: ["dataManager", "chiefInvestigator", "dataOwner"],
        dataOwner: ["chiefInvestigator", "dataOwner"],
        chiefInvestigator: ["chiefInvestigator"]
      }
    },
    searchFilters: [
      {
        name: "text_title",
        title: "search-refine-title",
        type: "exact",
        typeLabel: "search-refine-contains"
      },
      {
        name: "text_description",
        title: "search-refine-description",
        type: "exact",
        typeLabel: "search-refine-contains"
      },
      {
        name: "grant_number_name",
        title: "search-refine-grant_number_name",
        type: "facet",
        typeLabel: null,
        alwaysActive: true
      },
      {
        name: "finalKeywords",
        title: "search-refine-keywords",
        type: "facet",
        typeLabel: null,
        alwaysActive: true
      },
      {
        name: "workflow_stageLabel",
        title: "search-refine-workflow_stageLabel",
        type: "facet",
        typeLabel: null,
        alwaysActive: true
      }
    ]
  }
}
