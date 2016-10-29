/* GLOBAL VARIABLES */

var tempoWorklogsURL = '/rest/tempo-timesheets/3/worklogs';
var jiraSessionCookieName = 'JSESSIONID';
var strDateFrom = '2016-01-01'; //An old date before which worklogs definately were NOT entered. 

var burnDataStore = { "burnanator": { "hoursInWorkingDay": 0, "jiraURLTrunk": "", "firstRun": true, "upliftAppliesTo": "uplift_time", "projects": [] } };
var sessionCookieValue = '';
var activeProjectKey ='';
var activeProject = {};
var activeProjectHasConfiguredRates = false;
var activeProjectWorklogs = {};
var summedUserWorklogs = {};

/* BUSINESS LOGIC */

//helper function to render worklogs table based on uplifted time mode
function render_uplifted_time_worklogs() 
{
    //write out the table heading
    $('.results_table_container #results_table').append('<tr>'
        + '<th>Username</th>'
        + '<th>Time spent (hours)</th>'
        + '<th>Raw Time spent (days)</th>'
        + '<th>Uplift factor</th>'
        + '<th>Uplifed Time Spent (days)</th>' 
        + '<th>Day rate</th>'
        + '<th>Budget burnt</th>'
        + '</tr>');

    //variables to hold totals
    var totalTimeSpentHours = 0;
    var totalRawTImeSpentDays = 0
    var totalUpliftedTimeSpentDays = 0;
    var totalBurn = 0;
    //TODO

    //write out the aggregated worklogs
    for (var userKey in summedUserWorklogs)
    {
        //get this aggregated worklog
        var summedUserWorklog = summedUserWorklogs[userKey];
        //hours
        var userWorklogHours = summedUserWorklog.timeSpentSeconds / 3600;
        totalTimeSpentHours += userWorklogHours;
        //raw days
        var rawUserWorklogDays = userWorklogHours / burnDataStore.burnanator.hoursInWorkingDay;
        totalRawTImeSpentDays += rawUserWorklogDays;
        //uplifted days
        var upliftedUserWorklogDays = rawUserWorklogDays * summedUserWorklog.manualUplift;
        totalUpliftedTimeSpentDays += upliftedUserWorklogDays;
        //burn
        var userBurn = upliftedUserWorklogDays * summedUserWorklog.rate;
        totalBurn += userBurn;

        //append the user result to the table
        $('.results_table_container #results_table').append('<tr>' 
            + '<td>' + userKey + '</td>'
            + '<td>' + userWorklogHours.toFixed(2) + '</td>'
            + '<td>' + rawUserWorklogDays.toFixed(2) + '</td>'
            + '<td>' + summedUserWorklog.manualUplift + '</td>'
            + '<td>' + upliftedUserWorklogDays.toFixed(2) + '</td>'
            + '<td>' + summedUserWorklog.rate + '</td>'
            + '<td>' + userBurn.toFixed(2) + '</td>'
            +'</tr>');
    } 

    //write out totals
    $('.results_table_container #results_table').append('<tr>' 
        + '<td>Totals</td>'
        + '<td>' + totalTimeSpentHours.toFixed(2) + '</td>'
        + '<td>' + totalRawTImeSpentDays.toFixed(2) + '</td>'
        + '<td>-</td>'
        + '<td>' + totalUpliftedTimeSpentDays.toFixed(2) + '</td>'
        + '<td>-</td>'
        + '<td>' + totalBurn.toFixed(2) + '</td>'
        +'</tr>');
}


function render_uplifted_rate_worklogs() 
{
    //write out the table heading
    $('.results_table_container #results_table').append('<tr>'
        + '<th>Username</th>'
        + '<th>Time spent (hours)</th>'
        + '<th>Time spent (days)</th>'
        + '<th>Day rate</th>'
        + '<th>Uplift factor</th>'
        + '<th>Uplifted Day rate</th>'
        + '<th>Budget burnt</th>'
        + '</tr>');

    //write out the aggregated worklogs
    for (var userKey in summedUserWorklogs)
    {
        var summedUserWorklog = summedUserWorklogs[userKey];
        var userWorklogHours = summedUserWorklog.timeSpentSeconds / 3600;
        var userWorklogDays = userWorklogHours / burnDataStore.burnanator.hoursInWorkingDay;
        var upliftedRate = summedUserWorklog.rate * summedUserWorklog.manualUplift;
        var userBurn = userWorklogDays * upliftedRate;

        $('.results_table_container #results_table').append('<tr class="totals">' 
            + '<td>' + userKey + '</td>'
            + '<td>' + userWorklogHours.toFixed(2) + '</td>'
            + '<td>' + userWorklogDays.toFixed(2) + '</td>'
            + '<td>' + summedUserWorklog.rate + '</td>'
            + '<td>' + summedUserWorklog.manualUplift + '</td>'
            + '<td>' + upliftedRate + '</td>'
            + '<td>' + userBurn.toFixed(2) + '</td>'
            +'</tr>');
    } 

    //TODO - totals
}

//helper function - work out if we are in uplifted time or rate mode
function display_worklogs () 
{
    //are we in uplifted time, or uplifted rate mode?
    if (burnDataStore.burnanator.upliftAppliesTo == 'uplift_time') 
    {
        render_uplifted_time_worklogs();
    } else {
        render_uplifted_rate_worklogs();
    }
}

//helper function to write out a list of worklogs
function aggregate_worklogs()
{
    $('#api_call_status').text('Found ' + activeProjectWorklogs.length + ' workogs');

    //chomp through the worklogs and build up a json array of total time spent by user
    for (var worklog, i = 0; worklog = activeProjectWorklogs[i++];) {
        var username = worklog.author.name;
        var timeSpentSeconds = isNaN(worklog.timeSpentSeconds) ? 0 : worklog.timeSpentSeconds;
        var billedSeconds = isNaN(worklog.billedSeconds) ? 0 : worklog.billedSeconds;

        //check to see if this user has already been added
        if ((username in summedUserWorklogs)) {
            //if so, increment their time
            summedUserWorklogs[username].timeSpentSeconds += timeSpentSeconds;
            summedUserWorklogs[username].billedSeconds += billedSeconds;
        } else {
            //try and get a rate and uplift for this user
            var rate = '0';
            var manualUplift = '0';
            for (var rateEntry, j = 0; rateEntry = activeProject.rates[j++];) {
                if (rateEntry.username == username) {
                    rate = rateEntry.rate;
                    manualUplift = rateEntry.manualUplift;
                    //stop searching
                    break;
                }    
            }
            //add the entry to the summed worklogs object
            summedUserWorklogs[username] = {"timeSpentSeconds":timeSpentSeconds, "billedSeconds":billedSeconds, "rate":rate, "manualUplift":manualUplift};
        }
    }
    //write out the results
    display_worklogs();
}

//helper function to call Jira API and fetch worklogs
function fetch_worklogs(){
    // can now try and fetch some burns
    $('#api_call_status').text('Loading worklogs...');
    var strDateTo = (new Date()).toISOString().slice(0, 10).replace(/-/g, '-');
    $.ajax({
        type: 'GET',
        dataType: 'json',
        url: burnDataStore.burnanator.jiraURLTrunk + tempoWorklogsURL + '/?projectKey=' + activeProjectKey + '&dateFrom=' + strDateFrom + '&dateTo=' + strDateTo,
        data: { cookie: 'JSESSIONID=' + sessionCookieValue },
        success: function (result) {
            activeProjectWorklogs = result;
            //aggregate the worklogs up by user
            aggregate_worklogs();
        },
        error: function (result) {
            $('#api_call_status').text('Could not get worklogs. The reason was: ' + result.responseText);
        }
    });
}


//helper function to gather informaton on current jira project
function gather_project_info()
{
    //check we have a session cookie
    chrome.cookies.get({ 'url': burnDataStore.burnanator.jiraURLTrunk, 'name': jiraSessionCookieName }, function (cookie) {
        if (cookie) {
            sessionCookieValue = cookie.value;
            $('#session_id').text(sessionCookieValue);
            //check we have a project
            chrome.tabs.executeScript(
                null,
                {
                    code: 'var projectLink = document.getElementById("project-name-val").getAttribute("href"); projectLink'
                },
                function (result) {
                    if (result) {
                        var strProjectLink = result[0];
                        if (strProjectLink && strProjectLink.lastIndexOf('/') > 0) {
                            activeProjectKey = strProjectLink.substring(strProjectLink.lastIndexOf('/') + 1, strProjectLink.length);
                            $('#active_project').text(activeProjectKey);
                            //load the active project from the burnanator stroage object for quick repeat access
                            for (var project, i = 0; project = burnDataStore.burnanator.projects[i++];) {
                                if (project.projectKey == activeProjectKey) {
                                    activeProject = project;
                                    activeProjectHasConfiguredRates = true;
                                    //stop searching
                                    break;
                                }
                            }
                            //can now try API call to fetch Jira worklogs
                            fetch_worklogs();
                        } else {
                            $('#active_project').text('could not get current project - are you on a Jira tab?');
                        }
                    } else {
                        $('#active_project').text('could not get current project - are you on a Jira tab?');
                    }
                }
            );
        } else {
            $('#session_id').text('Could not find an active Jira session, are you logged in?');
        }
    });
}

//Load projects and settings from chrome data store and update UI accordingly
function load_settings() {
    chrome.storage.local.get('burnanator', function (result) {
        if (result.burnanator && result.burnanator.firstRun == false) {
            //set the local storage object to the result
            burnDataStore = result;
            //try and gather current project info
            gather_project_info();
        } else {
            //todo - handle first run messaging
        }
    });
}

/* WIRE UP EVENTS */
$(document).ready(function () {
    //start flow with loading settings from storage - everything is async, so function calls are nested. 
    load_settings();
});


