/* GLOBAL VARIABLES */

var jiraRootURL = 'https://jira.creator.co.uk';
var tempoWorklogsURL = '/rest/tempo-timesheets/3/worklogs';
var jiraSessionCookieName = 'JSESSIONID';
var strDateFrom = '2016-01-01'; //An old date before which worklogs definately were NOT entered. 
var workingHoursInDay = 8;

/* BUSINESS LOGIC */
function getActiveProject()
{
    /* attempt to do it via a call to the API that returned no items for some reason. 
    $.ajax({
        type: "GET",
        dataType: 'json',
        url: jiraRootURL+ "/rest/api/1.0/menus/browse_link.json?inAdminMode=false",
        data: { cookie: "JSESSIONID=9777C5D66AD18DA60029B5AF91B7645C" },
        success: function (result) {
            alert(result.key);
        }
        
    });
    */
}

function processWorklogs(jsonWorklogs)
{
    $('#api_call_status').text('Found ' + jsonWorklogs.length + ' workogs');

    //chomp through the worklogs and build up a json array of total time spent by user

    var uLookup = {};
    var aggregateWorklogs = {};

    for (var worklog, i = 0; worklog = jsonWorklogs[i++];) {
        var username = worklog.author.name;
        var timeSpentSeconds = isNaN(worklog.timeSpentSeconds) ? 0 : worklog.timeSpentSeconds;
        var billedSeconds = isNaN(worklog.billedSeconds) ? 0 : worklog.billedSeconds;

        if (!(username in uLookup)) {
            uLookup[username] = 1;
            aggregateWorklogs[username] = {"timeSpentSeconds":timeSpentSeconds,"billedSeconds":billedSeconds};
        } else
        {
            aggregateWorklogs[username].timeSpentSeconds += timeSpentSeconds;
            aggregateWorklogs[username].billedSeconds += billedSeconds;
        }
    }

    //write out the results
    for (var userKey in aggregateWorklogs)
    {
        var userWorklogHours = (aggregateWorklogs[userKey].timeSpentSeconds / 3600);
        var userWorklogDays = userWorklogHours / workingHoursInDay;
        $('.results_table_container #results_table').append('<tr><td>' + userKey + '</td><td>' + userWorklogHours.toFixed(2) + '</td><td>' + userWorklogDays.toFixed(2) + '</td></tr>');
    }    

}


/* WIRE UP EVENTS */

$(document).ready(function () {
    //check we have a session cookie
    chrome.cookies.get({ 'url': jiraRootURL, 'name': jiraSessionCookieName }, function (cookie) {
        if (cookie) {
            var sessionCookieValue = cookie.value;
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
                            var activeProjectKey = strProjectLink.substring(strProjectLink.lastIndexOf('/') + 1, strProjectLink.length);
                            $('#active_project').text(activeProjectKey);

                            // can now try and fetch some burns
                            $('#api_call_status').text('Loading worklogs...');
                            var strDateTo = (new Date()).toISOString().slice(0, 10).replace(/-/g, '-');
                            $.ajax({
                                type: 'GET',
                                dataType: 'json',
                                url: jiraRootURL + tempoWorklogsURL + '/?projectKey=' + activeProjectKey + '&dateFrom=' + strDateFrom + '&dateTo=' + strDateTo,
                                data: { cookie: 'JSESSIONID=' + sessionCookieValue },
                                success: function (result) {
                                    processWorklogs(result);
                                },
                                error: function (result) {
                                    $('#api_call_status').text('Could not get worklogs. The reason was: ' + result.responseText);
                                }
                            });
                        } else {
                            $('#active_project').text('could not get current project - are you on a Jira tab?');
                        }
                    } else {
                        $('#active_project').text('could not get current project - are you on a Jira tab?');
                    }
                }
            );
        } else
        {
            $('#session_id').text('Could not find an active Jira session, are you logged in?');
        }
    });

});


