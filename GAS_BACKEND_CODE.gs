/**
 * Filmify Wedding Team Management - Backend Script
 * Paste this into your Google Apps Script editor.
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  const action = e.parameter.action;
  let result;

  try {
    if (action === 'getInitialData') {
      result = getInitialData();
    } else if (action === 'assignTeamMember') {
      result = assignTeamMember(e.parameter.assignmentId, e.parameter.memberName);
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const postData = JSON.parse(e.postData.contents);
  const action = postData.action;
  let result;

  try {
    if (action === 'saveProject') {
      result = saveProject(postData.data);
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getInitialData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Ensure sheets exist
  const projectSheet = getOrCreateSheet(ss, "Projects");
  const teamSheet = getOrCreateSheet(ss, "Team");
  const configSheet = getOrCreateSheet(ss, "Config");

  // Get Projects
  const projects = getProjectsFromSheet(projectSheet);
  
  // Get Team
  const teamMembers = teamSheet.getDataRange().getValues().slice(1).map(row => ({
    name: row[0],
    role: row[1],
    phone: row[2]
  }));

  // Get Config
  const roles = configSheet.getRange("A2:A").getValues().flat().filter(String);
  const subEvents = configSheet.getRange("B2:B").getValues().flat().filter(String);

  return {
    appName: "Filmify Wedding Team Management",
    projects: projects,
    teamMembers: teamMembers,
    availableRoles: roles.length ? roles : ["TM", "Ass", "TP", "TV", "CP", "CV", "Dron", "Reel"],
    availableSubEvents: subEvents.length ? subEvents : ["Wedding", "Sangeet", "Haldi", "Reception", "Pre-Wedding"],
    calendarUrl: ""
  };
}

function getProjectsFromSheet(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const rows = data.slice(1);
  
  // Group by Project ID
  const projectMap = {};
  
  rows.forEach(row => {
    const pId = row[0];
    if (!projectMap[pId]) {
      projectMap[pId] = {
        projectId: pId,
        clientName: row[1],
        eventDate: row[2],
        location: row[3],
        assignments: []
      };
    }
    
    if (row[4]) { // If assignment exists
      projectMap[pId].assignments.push({
        assignmentId: row[4],
        projectId: pId,
        subEvent: row[5],
        subEventDate: row[6],
        subEventLocation: row[7],
        role: row[8],
        person: row[9],
        startTime: row[10],
        endTime: row[11],
        subEventNote: row[12]
      });
    }
  });
  
  return Object.values(projectMap);
}

function saveProject(project) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Projects");
  
  const pId = project.projectId || "P" + Date.now();
  
  // Remove existing rows for this project to overwrite
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === pId) {
      sheet.deleteRow(i + 1);
    }
  }
  
  // Add new rows
  project.assignments.forEach(as => {
    sheet.appendRow([
      pId,
      project.clientName,
      project.eventDate,
      project.location,
      as.assignmentId || "A" + Math.random().toString(36).substr(2, 9),
      as.subEvent,
      as.subEventDate,
      as.subEventLocation,
      as.role,
      as.person,
      as.startTime,
      as.endTime,
      as.subEventNote
    ]);
  });
  
  return { success: true, projectId: pId };
}

function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === "Projects") {
      sheet.appendRow(["ProjectID", "ClientName", "EventDate", "Location", "AssignmentID", "SubEvent", "SubEventDate", "SubEventLocation", "Role", "Person", "StartTime", "EndTime", "Note"]);
    } else if (name === "Team") {
      sheet.appendRow(["Name", "Role", "Phone"]);
    } else if (name === "Config") {
      sheet.appendRow(["Roles", "SubEvents"]);
    }
  }
  return sheet;
}
