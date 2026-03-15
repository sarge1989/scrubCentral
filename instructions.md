## Testing ScrubCentral Chrome Extension

### Prerequisites
- Google Chrome browser

### Setup

1. **Download and unzip** the extension zip file
2. Open **chrome://extensions** in Chrome
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the unzipped folder
6. Click the **puzzle piece** icon in the Chrome toolbar and **pin** ScrubCentral

### How to use

1. Navigate to a CPF page, e.g. https://www.cpf.gov.sg/member/retirement-income/milestones/reaching-age-55
2. Wait for the page to fully load
3. Click the **ScrubCentral** extension icon in the toolbar
4. Choose your settings:
   - **Transform Mode** — Simple English (plain language) or LLM-Optimized (structured for AI consumption)
   - **Reading Level** — Primary / Secondary / Adult (only applies to Simple English mode)
   - **Custom Instruction** — optional, e.g. "focus on retirement benefits"
5. Click **Transform this page**
6. Wait for the transformation to complete (typically 20–30 seconds)
7. The page text will be rewritten in place

### After transformation

- **View changes in new tab** — opens a side-by-side comparison with a diff view
- **Undo — restore original** — reverts the page to its original text

### Notes

- The extension works on any webpage but is designed for CPF.gov.sg pages
- Transformation requires an internet connection (text is processed by an AI model on our server)
- No data is collected passively — the extension only reads the page when you click Transform
