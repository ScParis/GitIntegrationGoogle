# GitHub Issues Importer

![GitHub Issues Importer](https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExcnMzYmNsbzA3dnpsZHYxN2NlYmZ4OHpvcHlnMWZ2c3owNWJ3eWxtNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/aT564S32DojlSN369u/giphy.gif)

Este projeto é um script do Google Apps que permite importar issues de um projeto do GitHub para uma planilha do Google Sheets. Abaixo estão as instruções para configurar e usar o script.

## Funcionalidades
- 🎨 Interface amigável para importação de issues.
- 🚀 Alto desempenho ao buscar dados diretamente do GitHub.
- 📊 Adiciona os dados das issues em uma planilha do Google Sheets.
- ✅ Valida a configuração do token do GitHub e IDs dos projetos.

Demonstração de Importação

## Pré-requisitos
- Uma conta no GitHub.
- Um projeto no GitHub com issues.
- Acesso ao Google Sheets.

## Configuração
1. **Criar um Token do GitHub**:
   - Vá para [Configurações de desenvolvedor do GitHub](https://github.com/settings/tokens).
   - Clique em **Generate new token** e selecione as permissões necessárias (pelo menos `repo`).
   - Copie o token gerado.

2. **Configurar o Script**:
   - Abra o Google Sheets e vá para `Extensões > Apps Script`.
   - Cole o código do script no editor.
   - No editor, vá para `Arquivo > Propriedades do projeto > Propriedades do script` e adicione as seguintes propriedades:
     - `GITHUB_TOKEN`: O token gerado do GitHub.
     - `PROJECT_IDS`: Os IDs dos projetos do GitHub, separados por vírgula.

3. **Executar o Script**:
   - No editor do Apps Script, clique em `Executar > onOpen` para adicionar o menu ao Google Sheets.
   - No Google Sheets, vá para o menu `GitHub Actions` e selecione `Importar Issues`.
   - Insira o número da milestone (opcional) e aguarde a importação das issues.

## Uso
Após a configuração, você pode usar o menu `GitHub Actions` no Google Sheets para importar as issues do seu projeto do GitHub. O script irá buscar as issues e adicioná-las à planilha ativa.

## Observações
- Os campos personalizados devem ser atualizados para refletir o que cada projeto contém. Certifique-se de que os campos no script correspondam aos campos utilizados no projeto do GitHub para garantir a importação correta das informações.

## Licença
Este projeto é licenciado sob a MIT License. Veja o arquivo LICENSE para mais detalhes.

## Contribuições
Contribuições são bem-vindas! Sinta-se à vontade para abrir um pull request ou relatar problemas.
