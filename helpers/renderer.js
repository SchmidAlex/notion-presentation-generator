let notion;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const apiKey = await window.api.getSecret('notion_api_key');
    if (typeof apiKey === 'string' && apiKey){
      document.getElementById('api-key-section').style.display = 'none';
      notion = window.api.createNotionClient(apiKey);
      await loadNotionPages();
    }
  } catch (error) {
    console.error('Error fetching API key from electron store: ', error);
  }
});

document.getElementById('save-key').addEventListener('click', async () => {
  const apiKey = document.getElementById('api-key').value;
  try {
    await window.api.setSecret('notion_api_key', apiKey);
    notion = window.api.createNotionClient(apiKey);
    document.getElementById('api-key-section').style.display = 'none';
    await loadNotionPages();
  } catch(error){
    console.error('Error saving API key into electron store: ', error);
  }
});

document.getElementById('generate-presentation').addEventListener('click', async () => {
  const pageId = document.getElementById('notion-pages').value;
  const content = await getPageContent(pageId);
  const markdown = convertToMarkdown(content);
  const slidesContent = generateSlides(markdown);

  window.api.openPresentation(slidesContent);
});

document.getElementById('save-presentation').addEventListener('click', () => {
  const slidesContent = document.querySelector('.slides').innerHTML;
  window.api.savePresentation(slidesContent);
});


document.getElementById('open-stored-presentation').addEventListener('click', async () => {
  const slidesContent = await window.api.openStoredPresentation();
  if (slidesContent) {
    window.api.openPresentation(slidesContent);
  } else{
    console.error("Error loading presentation");
  }
});

async function loadNotionPages() {
  const results = await getAllPages();
  const pagesDropdown = document.getElementById('notion-pages');
  pagesDropdown.innerHTML = '';

  results.forEach(page => {
    let title;

    if (page.properties.Seite && page.properties.Seite.title[0] && page.properties.Seite.title[0].plain_text){
      title = page.properties.Seite.title[0].plain_text;

    } else if (page.properties.title && page.properties.title.title[0] && page.properties.title.title[0].plain_text){
      title = page.properties.title.title[0].plain_text;

    } else {
      title = 'undefined';
    }

    const option = document.createElement('option');
    option.value = page.id;
    option.textContent = title;
    pagesDropdown.appendChild(option);
  });
}

async function getPageContent(pageId){
  try {
    const page = await notion.pages.retrieve({ page_id: pageId });
    const blocks = await getAllBlocks(pageId);

    return {page, blocks};
  } catch (error) {
    console.error("Error getting page content: ", error);
    return null;
  }
}

async function getAllBlocks(id){
  let blocks = [];
  let cursor;

  while (true) {
    const response = await notion.blocks.children.list({
      block_id: id,
      start_cursor: cursor,
    });

    for (const block of response.results) {
      blocks.push(block);
      if (block.has_children){
        const children = await getAllBlocks(block.id);
        blocks.push(...children);
      }
    }

    if (!response.has_more){
      break;
    }
    cursor = response.next_cursor;
  }
  return blocks;
}

function convertToMarkdown(content) {
  let markdown = '';
  let colHeader;
  let rowHeader;
  let width;

  if (content.page.properties.Seite && content.page.properties.Seite.title[0] && content.page.properties.Seite.title[0].plain_text){
    markdown += '# ' + content.page.properties.Seite.title[0].plain_text;

  } else if (content.page.properties.title && content.page.properties.title.title[0] && content.page.properties.title.title[0].plain_text){
    markdown += '# ' + content.page.properties.title.title[0].plain_text;

  } else {
    markdown += '# undefined';
  }

  markdown += '\n';

  content.blocks.forEach(block => {
    let text = '';
    block[block.type]?.rich_text?.forEach(blockText => {
      let specialColor = false;
      let bold = false;
      let code = false;
      let italic = false;
      let strikethrough = false;
      let underline = false;
      if (blockText.annotations) {
        if (blockText.annotations.color != "default") {
          specialColor = true;
          text += "<span style=\"color:" + blockText.annotations.color + "\">";
        }
        if (blockText.annotations.bold) {
          bold = true;
          text += "**";
        } 
        if (blockText.annotations.code) {
          code = true;
          text += "`";
        } 
        if (blockText.annotations.italic) {
          italic = true;
          text += "*";
        } 
        if (blockText.annotations.strikethrough) {
          strikethrough = true;
          text += "~~";
        } 
        if (blockText.annotations.underline) {
          underline = true;
          // Markdown does not have a defined syntax to underline text, 
          // you might want to use HTML tags like <u>...</u>
          // This works since reveal anyway try to convert the markdown to html
          text += "<u>";
        }

        text += blockText.plain_text;

        if (underline) {
          text += "</u>";
        }
        if (strikethrough) {
          text += "~~";
        }
        if (italic) {
          text += "*";
        }
        if (code) {
          text += "`";
        }
        if (bold) {
          text += "**";
        }
        if (specialColor) {
          text += "</span>";
        }
      } else {
        text += blockText.plain_text;
      }
    });

    switch (block.type) {
      case 'heading_1':
        markdown += '---\n';
        markdown += '# ' + text + '\n';
        markdown += '---\n';
        break;

      case 'heading_2':
        markdown += '---\n';
        markdown += '## ' + text + '\n';
        break;

      case 'heading_3':
        markdown += '---\n';
        markdown += '### ' + text + '\n';
        break;

      case 'bulleted_list_item':
        markdown += '- ' + text + '\n';
        break;
          
      case 'numbered_list_item':
        console.log(block);
        markdown += '1. ' + text + '\n';
        break;
          
      case 'to_do':
        markdown += '- [ ] ' + text + '\n';
        break;
          
      case 'quote':
        markdown += '> ' + text + '\n';
        break;
          
      case 'code':
        markdown += '```' + block.code.language + '\n' + text + '\n```\n';
        break;

      case 'child_page':
        // Not needed
        markdown += '';
        break;

      case 'divider':
        markdown += '---\n';
        break;

      case 'image':
        markdown += '![Alt text](' + block.image.file.url + ')\n';
        break;

      case 'table':
        colHeader = block.table.has_column_header;
        rowHeader = block.table.has_row_header;
        width = block.table.table_width;
        break;

      case 'table_row':
        markdown += "| ";
        let first = true;
        block.table_row.cells.forEach(cell => {
          if (rowHeader && first){
            if (cell.length > 0 && cell[0].plain_text){
              markdown += "***" + cell[0].plain_text + "*** | ";
            } else {
              markdown += "*** | ";
            }
          } else {
            if (cell.length > 0 && cell[0].plain_text){
              markdown += cell[0].plain_text + " | ";
            } else {
              markdown += " | ";
            }
          }
          first = false
        });
        markdown += "\n";

        if (colHeader){
          markdown += "|";

          for (let i = 0; i < block.table_row.cells.length; i++) {
            markdown += "------|";
          }
          markdown += "\n";
          colHeader = false;
        }        

        break;

      case 'paragraph':
        markdown += text;
        markdown += '\n';
        break;

      case 'link_to_page':
        const link = block.link_to_page;
        if (link.type === 'page_id') {
          markdown += `[Link to page](https://www.notion.so/${link.page_id})\n`;
        } else if (link.type === 'database_id') {
          markdown += `[Link to database](https://www.notion.so/${link.database_id})\n`;
        }
        break;
    
      default:
        if (text){
          markdown += text + '\n';
        }
        console.error("Error no mapping to markdown: " + block.type);
        break;
    }
  });

  return markdown;
}

function generateSlides(notionContent) {
  const slidesContainer = document.querySelector('.slides');
  slidesContainer.innerHTML = '';

  const section = document.createElement('section');
  section.setAttribute('data-markdown', '');
  section.setAttribute('data-auto-animate', '');

  const textarea = document.createElement('textarea');
  textarea.setAttribute('data-template', '');
  textarea.innerHTML = notionContent;

  section.appendChild(textarea);
  slidesContainer.appendChild(section);

  return slidesContainer.innerHTML;
}

async function getAllPages() {
  const pages = [];
  let cursor;
  while (true) {
    const response = await notion.search({
      filter: { property: 'object', value: 'page'},
      sorts: [{
        timestamp: 'last_edited_time',
        direction: 'ascending',
      }],
      start_cursor: cursor,
    });
    
    pages.push(...response.results);
    if (!response.has_more) {
      break;
    }
    cursor = response.next_cursor;
  }
  return pages;
}
