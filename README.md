# Notion to Reveal.js Presentation App

This Electron application allows you to generate dynamic presentations from Notion pages using Reveal.js. 

## Features

- **Notion Integration:** Fetch content from Notion pages.
- **Markdown Conversion:** Convert Notion page content to Markdown.
- **Reveal.js Integration:** Create dynamic presentations using Reveal.js.
- **Save and Load Presentations:** Save presentations locally and reload them as needed.

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/SchmidAlex/notion-presentation-generator.git
   cd notion-to-reveal-presentation
   ```

2. **Install dependencies:**
    ```bash
   npm install
   ```

3. **Run the application:**
    ```bash
    npm start
    ```

## Usage
1. **Create Notion Integration:**
    - Go to https://www.notion.so/my-integrations || Click in the upper-right corner of the notion app on the three dots. Go on "Connect with" and click on "manage connections". Click at the bottom on "Develop or manage my own integrations".
    - Create a new connection, note that this app just needs the read right on the sites and nothing more.
    - Safe your API-Secret for later to use this app.
2. **Give Your Integration Read Rights... Again:**
    - I struggled hours with that, but in order that your integration can read your sites you need to add it for each page or parent as integration.
    - To do so, go in your notion app on the desired page or parent.
    - Click on the three dots in the upper right corner.
    - Go on connect with.
    - Search for your integration name you newly created (yes you need to search it with text, it does not sho up from itself).
    - Add it to the page / parent.
3. **Start App and Setup API Key:**
    - The app uses the electron "electron-store" to save the API-Secret.
    - When starting the app without any API-Secret, you will have a small input field and button to fill it in and store it.
4. **Generate Presentastion:**
    - Be patient with the app... it is really really slow, as you can see there are code-fragments which are not in use and are not necessary. It is not done by now tho.
    - After a looong time, in the dropdown you have a list of your pages (sorted by last edited).
    - Select a Notion page from the dropdown.
    - Click "Generate Presentation" to convert the Notion page content into a presentation.
5. **View Presentation:**
    - The presentation will open in a new window.
    - Click in the new window on the button "initialize reveal" to, yes you name it, initialize reveal.
6. **Save and Load Presentation:**
    - It is not implemented yet, but i plan to let you save and load presentations from locally, so you can even use the app without internet.

## Dependencies
- Electron: Build cross-platform desktop apps with JavaScript, HTML, and CSS.
- Notion SDK: Official Notion API client for JavaScript.
- Reveal.js: A framework for easily creating beautiful presentations using HTML.

## Contributing
Feel free to open issues or submit pull requests. Help or suggestions and contibutions are welcome!