/* GLOBAL VARIABLES */

var tfsRootURL = "http://ukodevtfs02:8080/tfs/web/";
var tfsNewTicketURLTrunk = tfsRootURL + "UI/Pages/WorkItems/WorkItemEdit.aspx";
var maxStorageSize = 10;

/* BUSINESS LOGIC */

//Process ticket jump command
function ProcessTicketJump () 
{
	//Do we want to go to a ticket number or searh for tickets containing a string?
	var command = $("#txt_ticket_ID").val();
	//Did the user enter a value?
	if (command != "") 
	{
		//The user entered a value
		if (isNaN(command))
		{
			//A string was entered - search
			var rootUrl = tfsRootURL + "UI/Pages/Search.aspx?&bctitle=Search%20Results&kws=";
			var encodedCommand = encodeURIComponent(command);
			var searchURL = rootUrl + encodedCommand;
			//Store command in activity feed
			SaveActivity("search", encodedCommand); 
			//Open URL in new tab
			chrome.tabs.create({ url: searchURL });
		} else 
		{
			//A number was entered - jump to ticket
			var rootUrl = tfsRootURL + "wi.aspx?id=";
			var ticketURL = rootUrl + command;
			//Store command in activity feed
			SaveActivity("ticketno", command); 
			//Open URL in new tab
			chrome.tabs.create({ url: ticketURL });
		}
	} 
	else 
	{
		//The user did not enter a value
		if ($(".jump_to_ticket span.error").length == 0) {
			// Show error message
			$(".jump_to_ticket").append("<span class='error'>please enter a value</span>");
		}
	}
}

//Process new item command
function ProcessNewItem () 
{
	//get selected value
	var strSelectedVal = $("#select_create_new").val();
	//save activity
	SaveActivity("createnew", strSelectedVal); 
	switch (strSelectedVal) {
		case "0":
			// BUG
            chrome.tabs.create({ url: tfsNewTicketURLTrunk + "?wit=Bug" });
            break;
        case "1":
            // PBI
            chrome.tabs.create({ url: tfsNewTicketURLTrunk + "?wit=Product%20Backlog%20Item" });
            break;
        case "2":
            // TASK
			chrome.tabs.create({ url: tfsNewTicketURLTrunk + "?wit=Task" });
            break;
        default :
            break;  
	}
}

//Save an item of activity
function SaveActivity(commandType, executedCommand) 
{
	//Get storage object from memory
	var storageObj = chrome.extension.getBackgroundPage().masterStorageObject;
	//Get last modified date
	var lastModified = storageObj["TFSToolsStore"][0]["RecentActivity"][0]["LastModified"];
	//Get command list
	var commandList = storageObj["TFSToolsStore"][0]["RecentActivity"][1]["CommandList"];
	//Add the activity entry
	commandList.splice(0,0,{"commandType" : commandType, "executedCommand": executedCommand});
	//Remove last entry if needed
	if (commandList.length > maxStorageSize) 
	{
		commandList.pop();
	}
	//place the updated activity object back in the storage array
	storageObj["TFSToolsStore"][0]["RecentActivity"][1]["CommandList"] = commandList;
	//update the last modified date in the storage array
	storageObj["TFSToolsStore"][0]["RecentActivity"][0]["LastModified"] = Date.now();
	//save the updated storage object
	chrome.storage.sync.set(storageObj, function () {
		console.log("Activity saved");
	});
}

//Update activity feed UI
function UpdateActivityFeed (storageObj) 
{
	//clear all items - note need to also clear events and data
	$("#recent_activity").empty();
	//Get command list from storage object
	var commandList = storageObj["TFSToolsStore"][0]["RecentActivity"][1]["CommandList"];
	//For each command in the list
	for (var i = 0; i < commandList.length; i++) {
		var command = commandList[i];
		var liString = "<li id='item-" + i + "'>";
		switch (command.commandType) {
			case "search":
				// search
				var rawCommand = decodeURI(command.executedCommand);
				var commandLink = tfsRootURL + "UI/Pages/Search.aspx?&bctitle=Search%20Results&kws=" + command.executedCommand;
				liString += "searched for: <a class='activity-link' data-link='" + commandLink + "'>" + rawCommand + "</a>";
				break;
			case "ticketno":
				// jump to ticket
				var commandLink = tfsRootURL + "wi.aspx?id=" + command.executedCommand;
				liString += "opened ticket: <a class='activity-link' data-link='" + commandLink + "'>" + command.executedCommand + "</a>";
				break;
			case "createnew":
				// create new item - what type of item was created
				switch (command.executedCommand) {
					case "0":
						// BUG
						liString += "created new bug";
						break;
					case "1":
						// PBI
						liString += "created new PBI";
						break;
					case "2":
						// TASK
						liString += "created new task";
						break;
					default :
						break;  
				}				
				break;
			default :
				break;  
		}
		liString += "</li>";
		//Append the LI to the UL
		$("#recent_activity").append(liString);
	}
	//Wire up click events
	$("#recent_activity li a").each(function(){
		$(this).click(function(){
			var commandURL = $(this).data("link");
			chrome.tabs.create({ url: commandURL});
		});
	});
}

//Clears the activity list
function ClearActivityList ()
{
	//clear all items from UI
	$("#recent_activity").html("");
	//clear all items from storage
	var now = Date.now();
	var blankStorage = 
		{
		"TFSToolsStore" : 
			[
				{ "RecentActivity" : 
					[
						{ "LastModified" : now }, 
						{ "CommandList" : 
							[
							]
						}
					]
				}
			]
		};
	//Store the blank storage object
	chrome.storage.sync.set(blankStorage, function () {
		console.log("Clear activity list: Blank storage written");
	});
}

/* WIRE UP EVENTS */

$(document).ready(function () {

	//Wire up jump to ticket button click
	$("#btn_jump_to_ticket").click(function() {
		ProcessTicketJump();
	});

	//Wire up jump to ticket enter key
	$("#txt_ticket_ID").keydown(function(e) {
		e.which = e.which || e.keyCode;
		if (e.which == 13) 
		{
			ProcessTicketJump();
		}
	});

	//Wire up create ticket button
	$("#btn_create_new").click(function() {
		ProcessNewItem(); 
	});
	
	//Wire up clear activity list link
	$("#clear_activity_list").click(function(){
		ClearActivityList();
	});
	
	//Update activity feed UI
	UpdateActivityFeed(chrome.extension.getBackgroundPage().masterStorageObject);
});