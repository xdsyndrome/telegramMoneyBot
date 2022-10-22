/**
 * Set your own token, ssId, webURL and telegram ID
 */

var token = "";
var telegramUrl = "https://api.telegram.org/bot" + token;
var webAppUrl = "";

function setWebhook() {
  var url = telegramUrl + "/setWebhook?url=" + webAppUrl;
  var response = UrlFetchApp.fetch(url);
  Logger.log(response);
}

function sendMessage(id, text) {
  var url = telegramUrl + "/sendMessage?chat_id=" + id + "&text=" + text;
  var response = UrlFetchApp.fetch(url);
}

function sendText(id, text, keyboard) {
  var data = {
    method: "post",
    payload: {
      method: "sendMessage",
      chat_id: String(id),
      text: text,
      parse_mode: "HTML",
      reply_markup: JSON.stringify(keyboard)
    }
  };
  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/', data);
}

function getMe() {
  var url = telegramUrl + "/getMe";
  var response = UrlFetchApp.fetch(url);
  Logger.log(response.getContentText());
}

function getSplit() {
  var stringtest = "/ggg/555";
  Logger.log(stringtest.split("/")[1]);
  Logger.log(stringtest.charAt(0) == "/");
  Logger.log("deleteExpense".slice(0, 12));
}


/** 
 * Function for getting returning the latest 5 rows, less otherwise
*/
function getLastRows(id, sheet) {
  try {
    var lastRow = sheet.getDataRange().getLastRow();
    Logger.log(lastRow);
    recordList = []
    counter = 0;

    for (var i = lastRow; i > 1; i--) {
      var date = sheet.getRange(i, 2).getValue();
      var item = sheet.getRange(i, 3).getValue();
      var price = sheet.getRange(i, 4).getValue();

      recordList.push(
        [
          {
            "text": "Delete Transaction: " + date + " | " + item + " | " + price,
            "callback_data": "deleteExpense_" + i
          }
        ]
      )
      counter++
      if (counter >= 5) {break;}
    }
    Logger.log(recordList);
    // Send keyboard with list to delete

    var keyboard = {
      "inline_keyboard": []
    };

    recordList.forEach(element => keyboard["inline_keyboard"].push(element));
    sendText(id, "<b><u> Choose which expense to delete: </u></b>", keyboard);
  } catch (e) {
    sendMessage(id, "Error occurred while getting latest transactions: " + e);
  }
  
}

/**
 * Delete item
 */
function deleteItem(id, sheet, data) {
  try {
    var items = data.split("_");
    sheet.deleteRow(items[1]);
    sendMessage(id, "Expense deleted!");
  } catch (e) {
    sendMessage(id, "Error occurred while deleting: " + e);
  }
}

/**
 * Displays help info
 */
function sendHelpMessage(id, logsSheet) {
  try {
    var message = "To add or delete expense type /start. If you are bored type /b followed by any questions or sentences. Type /message to check message quota.";
    sendMessage(id, message);
  } catch (e) {
    sendMessage(id, "Error occurred in help");
    logsSheet.appendRow(["Error: sendHelpMessage", e]);
  }
}

/**
 * Fun function for bored people
 */
function userBored(id, ssId) {
  try {
    var boredSheet = SpreadsheetApp.openById(ssId).getSheetByName("misc");
    var logsSheet = SpreadsheetApp.openById(ssId).getSheetByName("Logs");
    var lastRow = boredSheet.getDataRange().getLastRow();
    var line = Math.floor(Math.random() * lastRow) + 1;
    sendMessage(id, boredSheet.getRange(line, 1).getValue());
  } catch (e) {
    logsSheet.appendRow(["Error: userBored", e]);
    sendMessage(id, "Oh no something is wrong with me :(");
  }
  
}


function doPost(e) {
  // Logger.log(e)
  var contents = JSON.parse(e.postData.contents);
  var ssId = "";
  var claimsSheet = SpreadsheetApp.openById(ssId).getSheetByName("Claims");
  var logsSheet = SpreadsheetApp.openById(ssId).getSheetByName("Logs");
  logsSheet.appendRow(["doPost", contents]);
  
  // Based on type of content
  if (contents.callback_query) {
    var id = contents.callback_query.from.id;

    if (id == "") {
      var data = contents.callback_query.data;

      if (data == "addExpense") {
          logsSheet.appendRow(["addExpense", contents.callback_query.data]);
          sendMessage(id, "Please specify expense in the format $ITEM$PRICE");
        } else if (data.length == "deleteExpense".length && data == "deleteExpense") {
          // Get last 5 transactions and ask user which to delete
          getLastRows(id, claimsSheet);
        } else if (data.slice(0, 13) == "deleteExpense") {
          // Delete item based on user selection
          deleteItem(id, claimsSheet, data);
        }
      } else {
        sendMessage(id, "Invalid User.");
      }
  } else if (contents.message) {
    var id = contents.message.from.id;
    if (id == "") {
      var text = contents.message.text;
      
      if (text.charAt(0) == "$") {
        var items = text.split("$");
        var nowDate = new Date();
        var date = nowDate.getMonth()+1+'/'+nowDate.getDate();
        claimsSheet.appendRow(["expense", date, items[1], items[2]]);
        sendMessage(id, "Added item " + items[1] + " successfully!");

      } else if (text == "/help") {
        sendHelpMessage(id, logsSheet);
      } else if (text == "/start") {
        var keyboard = {
            "inline_keyboard": [
              [
                {
                  "text": "Add Expense",
                  "callback_data": "addExpense"
                }
              ],
              [
                {
                  "text": "Delete Expense",
                  "callback_data": "deleteExpense"
                }
              ]
            ]
          };
        sendText(id, "How may I help you?", keyboard);
      } else if (text.slice(0,2) == "/b") {
        if (text.length > 2) {
          userBored(id, ssId);
        } else {
          sendMessage(id, "Did you ask me something?");
        }
      } else if (text == "/message") {
        sendMessage(id, "Current Message Count is " + contents.message.message_id + ". Max is 20000 per month.")
      } else {
        // All other entries
        sendMessage(id, "Hi " + contents.message.from.first_name)
        sendMessage(id, "Type /start to start logging expenses, /help if you want to know more about me!")
      }
      
    } else {
      sendMessage(id, "Invalid User.");
    }
  }  
}
