var noOfNewRates = 1;
var burnDataStore = {"burnanator": {"projects":[  ] } };
var statusContainer;
var projectsList;

/* HELPER METHODS */

//Shows and error message
function displayErrorMessage(message)
{
    statusContainer.addClass('error');
    statusContainer.html('<p>'+ message + '</p>');
        setTimeout(function () {
            statusContainer.empty();
            statusContainer.removeClass('error');
        }, 2500);
}

//Shows a success message
function displaySuccessMessage(message)
{
    statusContainer.addClass('success');
    statusContainer.html('<p>'+ message + '</p>');
        setTimeout(function () {
            statusContainer.empty();
            statusContainer.removeClass('success');
        }, 2500);
}

/* UI METHODS */

//Re-populate the projects dropdown list from the local variable
function display_projects ()
{
    projectsList.empty();
    projectsList.append('<option value="">Pick one...</option>');
    for (var project, i = 0; project = burnDataStore.burnanator.projects[i++];) 
    {
        projectsList.append('<option value="'+ project.projectKey + '">' + project.projectKey + '</option>');
    }
}

//Write out the desired project details into boxes where it can be edited
function render_project(key) 
{
    var ratesContainer = $('#existing_project_container div.rates_container');
    //check the key is not empty (i.e. the default option)
    if (key =='')
    {
        ratesContainer.empty();
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
                //stop searching
                return;
            }
        }
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

//Load projects from chrome data store and update dropdown list
function load_projects() {
    chrome.storage.local.get('burnanator', function (result) {
        if(result.burnanator) {
            //update the storage variable
            burnDataStore = result;
            //update the list of projects based on the contents of the variable.
            display_projects();
            displaySuccessMessage('Loaded projects from chrome local storage');
        } else {
            displayErrorMessage('No projects found in chrome local storage');
        }
    });
}

//Save a new project
function save_new_project () 
{
    //get the project key
    var projectKey = $('#new_project_container input#new_project_key').val();
    if (projectKey == '') {
        displayErrorMessage('Not saved: You entered a blank project key');
    } else {
        //get the rates
        var valid = true;
        var rates = [];
        $('#new_project_container div.rates_container div.rate').each(function() {
            var username = $('input.txt_new_username', this).val();
            var rate = $('input.txt_new_rate', this).val();
            if (username == '' || rate == '')
            {
                valid = false;
            } else
            {
                rates.push({"username":username, "rate":rate});
            }
        });
        //if valid, save the rates
        if (valid) {
            //add the rates to the data store
            var project = {"projectKey":projectKey,"rates":rates};
            burnDataStore.burnanator.projects.push(project);
            save_data_store();

        } else {
            displayErrorMessage('Not saved: You entered a blank username or rate');
        }
    }
}

//Save a new project
function save_existing_project (key) 
{
    //todo
}

//Delete an existing project
function delete_project (key) 
{
    if (key == '') {
        displayErrorMessage('No project selected for deletion');
    } else {
        //get the project from the local variable. 
        for (var project, i = 0; project = burnDataStore.burnanator.projects[i++];) 
        {
            if (project.projectKey == key) {
                var removed = burnDataStore.burnanator.projects.splice(i-1,1);
                save_data_store();
                //stop searching
                return;
            }
        }
        displayErrorMessage('Could not find project to delete');
    }
}

/* WIRE UP EVENTS */

$(document).ready(function () {
    //set up variables
    statusContainer = $('#status_container');
    projectsList = $('#existing_project_container select#saved_projects');
    
    //load existing projects from storage and populate dropdown
    load_projects();

    //New project events
    $("#new_project").click(function () {
        $('#new_project_container').show();
    });

    $("#new_save").click(function () {
        save_new_project();
    });

    $('#new_project_container #new_add_another').click(function () {
        $('#new_project_container .rates_container').append('<div class="rate"><input type="text" id="new_username' + noOfNewRates + '" name="new_username' + noOfNewRates + '" placeholder="Enter a username" class="txt_new_username"/><input class="txt_new_rate" type="text" id="new_rate' + noOfNewRates + '" name="new_rate' + noOfNewRates + '" placeholder="Enter a dayrate"/></div>');
        noOfNewRates++;
    });

    //Edit project events
    $("#load_project").click(function () {
        $('#existing_project_container').show();
    });

    $("#existing_save").click(function () {
        var selectedProject = projectsList.val();
        save_existing_project(selectedProject);
    });

    $("#existing_delete").click(function () {
        var selectedProject = projectsList.val();
        delete_project(selectedProject);
    });

    $('#existing_project_container #existing_add_another').click(function () {
        //todo
    });

    projectsList.change(function() {
        //get selected value
        var selectedProject = $(this).val();
        render_project(selectedProject);
    });

    //Clear storage event
    $('#clear').click(function(){
        burnDataStore = {"burnanator": {"projects":[  ] } };
        save_data_store();
    });

});