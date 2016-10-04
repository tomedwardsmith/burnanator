/* GLOBAL VARIABLES */

//logic variables
var burnDataStore = { "burnanator": { "projects": [] } };

//jquery UI objects to make page more performant
var statusContainer = $('div#status_container');
var controlsContainer = $('div#controls_container');
var newProjectContainer = $('div#new_project_container');
var existingProjectContainer = $('div#existing_project_container');
var settingsContainer = $('div#settings_container');
var projectsList = $('div#existing_project_container select#saved_projects');

/* HELPER METHODS */

//Shows and error message
function displayErrorMessage(message)
{
    statusContainer.addClass('error');
    statusContainer.html('<span>' + message + '</span>');
        setTimeout(function () {
            statusContainer.empty();
            statusContainer.removeClass('error');
        }, 2500);
}

//Shows a success message
function displaySuccessMessage(message)
{
    statusContainer.addClass('success');
    statusContainer.html('<span>' + message + '</span>');
        setTimeout(function () {
            statusContainer.empty();
            statusContainer.removeClass('success');
        }, 2500);
}

/* UI METHODS */

//called when the cancel button is hit, or when a new project is saved, or when an existing project is updated.
function resetUi() {
    //disable existing projects buttons
    $("#existing_save").prop('disabled', 'disabled');
    $("#existing_delete").prop('disabled', 'disabled');
    $('#existing_add_another').prop('disabled', 'disabled');

    //empty any rates in existing project UI
    $('div.rates_container', existingProjectContainer).empty();

    //re-populate existing projects dropdown list from local variable (and handle edit existing button state)
    populate_projects_dropdown();

    //reset new project UI to start position
    $('#new_project_key', newProjectContainer).val('');
    $('div.rates_container', newProjectContainer).empty();
    $('div.rates_container', newProjectContainer).append('<div class="rate"><input type="text" class="txt_new_username" id="new_username0" name="new_username0" placeholder="Enter a username" /><input type="text" class="txt_new_rate" id="new_rate0" name="new_rate0" placeholder="Enter a dayrate"/></div>');

    //hide containers
    newProjectContainer.hide();
    existingProjectContainer.hide();
    settingsContainer.hide();

    //show controls container
    controlsContainer.show();
}

//Re-populate the projects dropdown list from the local variable. Also handle the edit existing project button state
function populate_projects_dropdown()
{
    projectsList.empty();
    //may have hit UI event on first run so handle that but checking we have a defined local variable
    if (burnDataStore.burnanator && burnDataStore.burnanator.projects.length > 0) {
        projectsList.append('<option value="">Pick one...</option>');
        for (var project, i = 0; project = burnDataStore.burnanator.projects[i++];) {
            projectsList.append('<option value="' + project.projectKey + '">' + project.projectKey + '</option>');
        }
        //enable the edit button
        $('#edit_projects').prop('disabled', false);
    } else {
        //disable the button. It is disabled on load, but this is called on cancel / delete events etc. 
        $('#edit_projects').prop('disabled', 'disabled');
    }
}

//Write out the desired project rate card into boxes where it can be edited
function render_project(key) 
{
    var ratesContainer = $('div.rates_container', existingProjectContainer);
    //check the key is not empty (i.e. the default option)
    if (key =='')
    {
        ratesContainer.empty();
        //disable buttons
        $("#existing_save").prop('disabled', 'disabled');
        $("#existing_delete").prop('disabled', 'disabled');
        $('#existing_add_another').prop('disabled', 'disabled');
    } else {
        //get the project from the local variable. 
        for (var project, i = 0; project = burnDataStore.burnanator.projects[i++];) 
        {
            if (project.projectKey == key) {
                //clear the rates container
                ratesContainer.empty();
                //Write out the rates
                for (var rateEntry, j = 0; rateEntry = project.rates[j++];) 
                {
                    ratesContainer.append('<div class="rate"><input type="text" class="txt_existing_username" id="existing_username' + j + '" name="existing_username' + j + '" placeholder="Enter a username" value="' + rateEntry.username + '" /><input type="text" class="txt_existing_rate" id="existing_rate' + j + '" name="existing_rate' + j + '" placeholder="Enter a dayrate" value="' + rateEntry.rate + '"/></div>'); 
                }
                //enable buttons
                $("#existing_save").prop('disabled', false);
                $("#existing_delete").prop('disabled', false);
                $('#existing_add_another').prop('disabled', false);
                //stop searching
                return;
            }
        }
        displayErrorMessage('Error: could not find project in memory. Close and re-open burnanator options.');
    }
}

/* STORAGE METHODS */

//Save the data store object to chrome local storage
function save_data_store () 
{
    chrome.storage.local.set(burnDataStore, function () {
        // Update status to let user know options were saved.
        displaySuccessMessage('Saved to local chrome storage');
    });
} 

//Load projects and settings from chrome data store and update UI accordingly
function load_settings() {
    chrome.storage.local.get('burnanator', function (result) {
        if (result.burnanator) {
            //set the local storage object to the result
            burnDataStore = result;
            //TODO - update settings
            //...
            //if we have some stored rate cards - update the UI accordingly
            if (result.burnanator.projects.length > 0) {
                //populate the projects dropdown
                populate_projects_dropdown();
                displaySuccessMessage('Loaded saved settings and project rate cards');
            } else {
                displayErrorMessage('No projects found; hit "New project" to get started');
            }
        } else {
            //Should be first run
            displayStatusMessage('No settings found; welcome to the burnanator; hit "New project" to get started');
        }
    });
}

//Save a new project
function save_new_project () 
{
    //get the project key
    var projectKey = $('input#new_project_key', newProjectContainer).val();
    if (projectKey == '') {
        displayErrorMessage('Not saved: You entered a blank project key');
    } else {
        //get the rates
        var valid = true;
        var rates = [];
        $('div.rates_container div.rate', newProjectContainer).each(function () {
            var username = $('input.txt_new_username', $(this)).val();
            var rate = $('input.txt_new_rate', $(this)).val();
            if (username == '' || rate == ''){
                valid = false;
            } else{
                rates.push({"username":username, "rate":rate});
            }
        });
        //if valid, save the rates
        if (valid) {
            //add the rates to the data store
            var project = {"projectKey":projectKey,"rates":rates};
            burnDataStore.burnanator.projects.push(project);
            //save the data store
            save_data_store();
            //update the UI
            resetUi();
        } else {
            displayErrorMessage('Not saved: You entered a blank username or rate');
        }
    }
}

//Save changes to an existing rate card
function save_existing_project () 
{
    var key = projectsList.val();
    if (key == '') {
        displayErrorMessage('Error: could not get selected project for editing. Close and re-open burnanator options.');
    } else {
        //get this project
        for (var project, i = 0; project = burnDataStore.burnanator.projects[i++];) {
            if (project.projectKey == key) {
                //get the rates
                var valid = true;
                var rates = [];
                $('div.rates_container div.rate', existingProjectContainer).each(function () {
                    var username = $('input.txt_existing_username', $(this)).val();
                    var rate = $('input.txt_existing_rate', $(this)).val();
                    if (username == '' || rate == '') {
                        valid = false;
                    } else {
                        rates.push({ "username": username, "rate": rate });
                    }
                });
                //if valid, save the rates
                if (valid) {
                    //take this project out of the in memory object
                    var removed = burnDataStore.burnanator.projects.splice(i - 1, 1);
                    //create a new project entry based on the key and ammended rates
                    var project = { "projectKey": key, "rates": rates };
                    //add this to the in memory object
                    burnDataStore.burnanator.projects.push(project);
                    //save the data store
                    save_data_store();
                    //update the UI
                    resetUi();
                } else {
                    displayErrorMessage('Not saved: You entered a blank username or rate');
                }
                //stop searching
                return;
            }
        }
        displayErrorMessage('Error: could not find slected project in memory. Close and re-open burnanator options.');
    }
}

//Delete an existing project
function delete_project () 
{
    var key = projectsList.val();
    if (key == '') {
        displayErrorMessage('Error: No project selected for deletion. Close and re-open burnanator options.');
    } else {
        //get the project from the local variable. 
        for (var project, i = 0; project = burnDataStore.burnanator.projects[i++];) 
        {
            if (project.projectKey == key) {
                //do the removal
                var removed = burnDataStore.burnanator.projects.splice(i - 1, 1);
                //save the updated data store to chrome storage
                save_data_store();
                //reset the UI
                resetUi();
                //stop searching
                return;
            }
        }
        displayErrorMessage('Error: could not find project to delete in memory. Close and re-open burnanator options.');
    }
}

/* WIRE UP EVENTS */

$(document).ready(function () {
    //load settings and existing rate cards from chrome storage and populate dropdown
    load_settings();

    /*NEW RATE CARD EVENTS*/
    $('#new_project').click(function () {
        newProjectContainer.show();
        controlsContainer.hide();
    });

    $("#new_save").click(function () {
        save_new_project();
    });

    $('#new_add_another').click(function () {
        var noOfNewRates = $('div.rates_container div.rate', newProjectContainer).length;
        $('div.rates_container', newProjectContainer).append('<div class="rate"><input type="text" id="new_username' + noOfNewRates + '" name="new_username' + noOfNewRates + '" placeholder="Enter a username" class="txt_new_username"/><input class="txt_new_rate" type="text" id="new_rate' + noOfNewRates + '" name="new_rate' + noOfNewRates + '" placeholder="Enter a dayrate"/></div>');
    });

    /*EXISTING RATE CARD EVENTS */
    $("#edit_projects").click(function () {
        existingProjectContainer.show();
        controlsContainer.hide();
    });

    $("#existing_save").click(function () {
        save_existing_project();
    });

    $("#existing_delete").click(function () {
        delete_project();
    });

    $('#existing_add_another').click(function () {
        var noOfExistingRates = $('div.rates_container div.rate', existingProjectContainer).length;
        $('div.rates_container', existingProjectContainer).append('<div class="rate"><input type="text" id="existing_username' + noOfExistingRates + '" name="existing_username' + noOfExistingRates + '" placeholder="Enter a username" class="txt_existing_username"/><input class="txt_existing_rate" type="text" id="existing_rate' + noOfExistingRates + '" name="existing_rate' + noOfExistingRates + '" placeholder="Enter a dayrate"/></div>');
    });

    projectsList.change(function() {
        //get selected value
        var selectedProject = $(this).val();
        render_project(selectedProject);
    });

    /*GLOBAL EVENTS*/
    $('button.cancel').click(function () {
        resetUi();
    });
    
    /*SETTINGS EVENTS*/
    //Clear storage event
    $('#clear').click(function(){
        burnDataStore = {"burnanator": {"projects":[  ] } };
        save_data_store();
    });

});