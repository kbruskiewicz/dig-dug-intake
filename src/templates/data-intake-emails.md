# [DIG Intake] Upload requested: {{name}} v{{version}} #{{human readable accession}}

{{author}} wants to upload a {{type}} dataset called {{name}}. There will be {{file number}} files of approximately {{file size}}.

The accession number is [#{{accession number}}](). You can see more details about the dataset on [this page]().

This dataset is at the {{individual/summary}} level. It contains approximately {{size}} datapoints.

Next steps:
* Contact BITS to provide an Aspera token, and send it to the researcher through [this form]().





# [DIG Intake] The dataset {{name}} v{{version}} is uploading! #{{human readable accession}}

{{author}} has begun uploading the dataset {{name}} at version {{version}}. 

The accession number is [#{{accession number}}](). You can see more details about the dataset on [this page]().

Next steps:
* Check the status of the upload using your Aspera client with session ID {{aspera}}.
* Remember! **The deadline for downloading this file** is {{deadline}}.

You will be reminded when the upload is complete, or if something has gone wrong with the upload.



# [DIG Intake] SUCCESS! You can now download {{name}} v{{version}}! #{{human readable accession}}

The deadline for downloading the dataset {{name}} v{{version}} is {{deadline}}.

There are {{file number}} files of approximately {{file size}}.

You have {{n}} days to download the dataset, before the Aspera site expires.

The accession number is [#{{accession number}}](). You can see more details about the dataset on [this page]().

Next step:
* Download the dataset using your Aspera client, using the session ID {{aspera}}.
* Contact BITS for help on downloading the dataset.

If you do nothing, you will be reminded to download this file in {{n}} days.



# [DIG Intake] REMINDER: Download #{{accession}} within {{n}} days!

The deadline for downloading dataset {{name}} v{{version}} is {{deadline}}.

You have {{n days}} to download the dataset.

The accession number is [#{{accession number}}](). You can see more details about the dataset on [this page]().

Next steps:
* Download the dataset using your Aspera client, using the session ID {{aspera}}.
* Contact BITS for help on downloading the dataset.

If you don't download the dataset now, you will be reminded to download these files in {{n}} days.



# [DIG Intake] You are now downloading {{name}} v{{version}} #{{human readable accession}}

The dataset {{name}} v{{version}} has been downloaded.

It can be downloaded as many times as wanted until {{deadline}}.

Next steps:
* Thank {{author}} for uploading the dataset.
* If you or the author need to revise the dataset, contact the author at {{e-mail}} to upload the dataset again. The version will increase, but the accession number will not change.

The files on Aspera will expire in {{n}} days on {{deadline}}.


Schedule for reminders: biweekly, then daily in lasst week











# [DIG Intale] WARNING! Dataset #{{accession number}} has failed to upload!

Next steps:
* Contact {{author}} to reupload the dataset 
* 

** TODO Data Chasing Project
*** Develop Project one-pager
**** Objectives
**** Requirements
**** Constraints
**** Stages
**** Deliverables
*** Do investigation into technologies to support architecture
**** Data Downloading Service
Supports hooks for:
- Download Start
- Download Ongoing
  + That it is ongoing
  + That at the time it has been sampled X amount of data has been uploaded
  + That at the time it has been sampled now and just before, X amount of data has been uploaed
- Download End

Messages must contain:
- The total expected filesize
- The source of the download
- When the download started
- Maybe, when it's expected to end

Services may allow for authentication (and accounts)
Services may allow for branding

***** Asepera
****** Useful features
****** API

***** Globus
****** Useful Features
Usage reports
Direct S3 storage
****** API
Transfer API
- Auth Tokens
- Task Monitoring
  https://docs.globus.org/api/transfer/task/#event_document
  Events Supported:
  - STARTED
  - SUCCESSFUL
  - PROGRESS
  - FILE_ACCESS
  - PAUSED
  - UNPAUSED
  - VERIFY_CHECKSUM
  - AUTH
  - CANCELED
  - EXPIRED
  - Errors
*** Notes
1. a
   a. a
   b. a
2. 
