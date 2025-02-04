const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

/**
 * Creates a menu item in the Google Sheets UI to trigger the import of GitHub issues.
 */
function onOpen() {
    SpreadsheetApp.getUi()
        .createMenu('GitHub Actions')
        .addItem('Importar Issues', 'fetchGitHubProjectCustomFields')
        .addToUi();
}

/**
 * Fetches GitHub project custom fields and imports them into the Google Sheet.
 */
function fetchGitHubProjectCustomFields() {
    const GITHUB_TOKEN = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
    const PROJECT_IDS = PropertiesService.getScriptProperties().getProperty('PROJECT_IDS');
    const ui = SpreadsheetApp.getUi();

    // Validate GitHub Token and Project IDs
    if (!GITHUB_TOKEN || GITHUB_TOKEN.length === 0) {
        ui.alert('Erro', 'GITHUB_TOKEN não configurado ou inválido.', ui.ButtonSet.OK);
        Logger.log('Erro: GITHUB_TOKEN não configurado ou inválido.');
        return;
    }

    if (!PROJECT_IDS || PROJECT_IDS.length === 0) {
        ui.alert('Erro', 'PROJECT_IDS não configurado ou inválido.', ui.ButtonSet.OK);
        Logger.log('Erro: PROJECT_IDS não configurado ou inválido.');
        return;
    }

    Logger.log(`Iniciando fetchGitHubProjectCustomFields com PROJECT_IDS: ${PROJECT_IDS}`);

    let milestoneNumber = '';
    let response = ui.prompt(
        'Milestone:',
        'Insira o número da milestone (ex: 356). Deixe vazio para buscar todas:',
        ui.ButtonSet.OK_CANCEL
    );

    if (response.getSelectedButton() === ui.Button.OK) {
        milestoneNumber = response.getResponseText().trim();
        Logger.log(`Número da milestone informado pelo usuário: ${milestoneNumber}`);
    } else {
        Logger.log(`Nenhuma milestone informada. Buscando todas`);
    }

    ui.alert('Aguarde', 'Importação das Issues iniciada...', ui.ButtonSet.OK);

    try {
        const allIssuesData = [];
        const projectIds = PROJECT_IDS.split(',').map(id => id.trim());
        let totalIssuesFetched = 0;

        for (const projectId of projectIds) {
            const issuesData = fetchDataFromGitHub(GITHUB_TOKEN, projectId, milestoneNumber);
            if (issuesData && issuesData.issues) {
                allIssuesData.push(issuesData);
                totalIssuesFetched += issuesData.issues.length;
            }
        }

        if (allIssuesData && allIssuesData.length > 0) {
            appendDataToSheet(allIssuesData);
            ui.alert('Sucesso', `Issues importadas com sucesso! Total de issues: ${totalIssuesFetched}`, ui.ButtonSet.OK);
            Logger.log('Finalizando fetchGitHubProjectCustomFields - Issues importadas com sucesso');
        } else {
            appendDataToSheet(allIssuesData);
            ui.alert('Atenção', 'Nenhuma issue encontrada.', ui.ButtonSet.OK);
            Logger.log('Finalizando fetchGitHubProjectCustomFields - Nenhuma issue encontrada.');
        }
    } catch (error) {
        ui.alert('Erro', `Erro ao processar os dados: ${error.message}`, ui.ButtonSet.OK);
        Logger.log(`Erro ao processar os dados: ${error.message}. Stack: ${error.stack}`);
    }
    Logger.log('Finalizando fetchGitHubProjectCustomFields');
}

/**
 * Fetches data from GitHub using the GraphQL API.
 * 
 * @param {string} token - The GitHub token to use for authentication.
 * @param {string} projectId - The ID of the project to fetch data from.
 * @param {string} milestoneNumber - The number of the milestone to filter by (optional).
 * @returns {object} An object containing the project title and issues.
 */
function fetchDataFromGitHub(token, projectId, milestoneNumber) {
    let allIssues = [];
    let after = null;
    let hasNextPage = true;
    let projectTitle = '';
    const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    while (hasNextPage) {
        const query = `query {
      node(id: "${projectId}") {
        ... on ProjectV2 {
          title
          items(first: 100 ${after ? `, after: "${after}"` : ""}) {
            nodes {
              content {
                ... on Issue {
                  title
                  number
                  url
                  assignees(first: 10) {
                    nodes {
                      login
                    }
                  }
                  labels(first: 10) {
                    nodes {
                      name
                    }
                  }
                  milestone {
                    title
                  }
                  projectItems(first: 100, includeArchived: false) {
                    nodes {
                        project {
                            id
                        }
                       fieldValueByNameStatus: fieldValueByName(name: "Status") {... on ProjectV2ItemFieldSingleSelectValue {name}}
                      fieldValueByNameSubIssuesProgress: fieldValueByName(name: "Sub-issues progress") {... on ProjectV2ItemFieldNumberValue {number}}
                      fieldValueByNameSizeBack: fieldValueByName(name: "Size back") {... on ProjectV2ItemFieldNumberValue {number}}
                      fieldValueByNameSizeFront: fieldValueByName(name: "Size front") {... on ProjectV2ItemFieldNumberValue {number}}
                      fieldValueByNameSizeQA: fieldValueByName(name: "Size QA") {... on ProjectV2ItemFieldNumberValue {number}}
                       fieldValueByNameType: fieldValueByName(name: "Type") {... on ProjectV2ItemFieldSingleSelectValue {name}}
                       fieldValueByNameStartedAt: fieldValueByName(name: "Started At") {... on ProjectV2ItemFieldDateValue {date}}
                      fieldValueByNameForecast: fieldValueByName(name: "Forecast") {... on ProjectV2ItemFieldDateValue {date}}
                       fieldValueByNamePriority: fieldValueByName(name: "Priority") {... on ProjectV2ItemFieldSingleSelectValue {name}}
                        fieldValueByNameVersion: fieldValueByName(name: "Version") {... on ProjectV2ItemFieldSingleSelectValue {name}}
                       fieldValueByNameQuarter: fieldValueByName(name: "Quarter") {... on ProjectV2ItemFieldSingleSelectValue {name}}
                       fieldValueByNameImpediment: fieldValueByName(name: "Impediment") {... on ProjectV2ItemFieldSingleSelectValue {name}}
                       fieldValueByNameTrackedBy: fieldValueByName(name: "Tracked by") {... on ProjectV2ItemFieldSingleSelectValue {name}}
                       fieldValueByNameParentIssue: fieldValueByName(name: "Parent issue") {... on ProjectV2ItemFieldTextValue {text}}
                    }
                  }
                }
              }
            }
            pageInfo {
                  hasNextPage
                  endCursor
                }
          }
        }
      }
    }`.replace(/[\n\s]+/g, ' ');

        Logger.log(`GraphQL Query: ${query}`);
        const options = {
            method: 'POST',
            headers: headers,
            payload: JSON.stringify({ query: query }),
            muteHttpExceptions: true
        };
        try {
            Logger.log('Enviando requisição para a API do GitHub...');
            const response = UrlFetchApp.fetch(GITHUB_GRAPHQL_URL, options);
            Logger.log(`Resposta da API do GitHub: ${response.getResponseCode()} ${response.getContentText()}`);
            if (response.getResponseCode() !== 200) {
                throw new Error(`Erro na requisição GraphQL: ${response.getResponseCode()} ${response.getContentText()}`);
            }
            const data = JSON.parse(response.getContentText());

            if (data.errors) {
                throw new Error(`Erro na API GraphQL: ${JSON.stringify(data.errors)}`);
            }
            projectTitle = data.data.node.title;

            let issues = data.data.node.items.nodes;
            if (milestoneNumber !== '') {
                issues = issues.filter(item => {
                    const issue = item.content;
                    return issue.milestone && issue.milestone.title === `Sprint ${milestoneNumber}`;
                });
                Logger.log(`Filtrando issues pela milestone ${milestoneNumber}. ${issues.length} encontradas`);
            }
            allIssues = allIssues.concat(issues);
            hasNextPage = data.data.node.items.pageInfo.hasNextPage;
            after = data.data.node.items.pageInfo.endCursor;

        } catch (error) {
            Logger.log(`Erro ao buscar dados do GitHub: ${error.message}. Stack: ${error.stack}`);
            throw error;
        }
    }

      return {
        projectTitle: projectTitle,
        issues: allIssues
    };
}


/**
 * Appends data to the Google Sheet.
 * 
 * @param {array} allIssuesData - An array of objects containing project title and issues.
 */
function appendDataToSheet(allIssuesData) {
    const sheet = SpreadsheetApp.getActiveSheet();
    let existingData = [];
    const lastRow = sheet.getLastRow();

    if (lastRow > 1) {
        existingData = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    }
    Logger.log('Limpando conteúdo da planilha, exceto cabeçalho...');
    if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
    }


    const headerRow = [
        'Team', 'Title', 'Assignees', 'Status', 'Labels', 'Milestone', 'Quarter', 'Started At',
        'Forecast', 'Size back', 'Size front', 'Size QA', 'Type', 'Priority', 'Version',
        'Impediment', 'Tracked by', 'Parent issue', 'Sub-issues progress'
    ];
    sheet.getRange(1, 1, 1, headerRow.length).setValues([headerRow]);
      let allNewRows = [];

       if (!allIssuesData || allIssuesData.length === 0) {
         Logger.log('Nenhuma issue encontrada.');
      if (existingData.length > 0) {
            sheet.getRange(2, 1, existingData.length, existingData[0].length).setValues(existingData);
        Logger.log(`Dados existentes mantidos: ${existingData.length} linhas.`);
        }
      return;
    }

   allIssuesData.forEach(issuesData => {
        const newRows = issuesData.issues.map(item => processIssue(item, issuesData.projectTitle));
       allNewRows = allNewRows.concat(newRows)
    })

    // Adiciona os dados existentes de volta
    if (existingData.length > 0) {
        sheet.getRange(2, 1, existingData.length, existingData[0].length).setValues(existingData);
    }

    if (allNewRows.length > 0) {
        const startRow = existingData.length > 0 ? existingData.length + 2 : 2;
        sheet.getRange(startRow, 1, allNewRows.length, allNewRows[0].length).setValues(allNewRows);
        Logger.log(`Foram adicionadas ${allNewRows.length} novas issues à planilha.`);
    }
    Logger.log(`Dados existentes mantidos: ${existingData.length} linhas.`);
}


/**
 * Processes an issue and returns an array of values to be written to the sheet.
 * 
 * @param {object} item - The issue to process.
 * @param {string} projectTitle - The title of the project.
 * @returns {array} An array of values to be written to the sheet.
 */
function processIssue(item, projectTitle) {
    try {
        const issue = item.content;
        const customFields = extractCustomFields(issue);

        const assignees = issue.assignees?.nodes?.map(assignee => assignee.login).join(', ') || '';
        const labels = issue.labels?.nodes?.map(label => label.name).join(', ') || '';
        const row = [
           projectTitle,
            issue.title,
            assignees,
            customFields['Status'],
            labels,
            issue.milestone?.title || '',
            customFields['Quarter'],
            customFields['Started At'],
            customFields['Forecast'],
            customFields['Size back'],
            customFields['Size front'],
            customFields['Size QA'],
            customFields['Type'],
            customFields['Priority'],
            customFields['Version'],
            customFields['Impediment'],
            customFields['Tracked by'],
            customFields['Parent issue'],
            customFields['Sub-issues progress']
        ];

        Logger.log(`Linha processada para issue: ${issue.title}`);
        return row;
    } catch (error) {
        Logger.log(`Erro ao processar a issue ${item.content.title}: ${error.message}. Stack: ${error.stack}`);
        return [];
    }
}


/**
 * Extracts custom fields from an issue.
 * 
 * @param {object} issue - The issue to extract custom fields from.
 * @returns {object} An object containing the custom fields.
 */
function extractCustomFields(issue) {
    const customFields = {};
     if(issue.projectItems && issue.projectItems.nodes && issue.projectItems.nodes.length > 0){
          const projectItem = issue.projectItems.nodes[0]
         customFields['Status'] = projectItem.fieldValueByNameStatus?.name || '';
        customFields['Sub-issues progress'] = projectItem.fieldValueByNameSubIssuesProgress?.number || '';
        customFields['Size back'] = projectItem.fieldValueByNameSizeBack?.number || '';
        customFields['Size front'] = projectItem.fieldValueByNameSizeFront?.number || '';
        customFields['Size QA'] = projectItem.fieldValueByNameSizeQA?.number || '';
        customFields['Started At'] = projectItem.fieldValueByNameStartedAt?.date || '';
        customFields['Forecast'] = projectItem.fieldValueByNameForecast?.date || '';
        customFields['Priority'] = projectItem.fieldValueByNamePriority?.name || '';
        customFields['Version'] = projectItem.fieldValueByNameVersion?.name || '';
        customFields['Quarter'] = projectItem.fieldValueByNameQuarter?.name || '';
        customFields['Type'] = projectItem.fieldValueByNameType?.name || '';
        customFields['Impediment'] = projectItem.fieldValueByNameImpediment?.name || '';
        customFields['Tracked by'] = projectItem.fieldValueByNameTrackedBy?.name || '';
        customFields['Parent issue'] = projectItem.fieldValueByNameParentIssue?.text || '';
           Logger.log(`Campos personalizados da issue ${issue.title} extraídos com sucesso.`);
     }else{
         Logger.log(`Nenhum campo personalizado encontrado para a issue ${issue.title}.`);
     }
    return customFields;
}