#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createInterface } from 'readline';
import process, { stdin , stdout, platform, env, argv, versions } from 'process';
import { promises as fs } from "fs"
import cp from 'child_process'
import { config } from './config.js'

const apiKeyName = "OPENAI_API_KEY"
const apiKeyUrl = "https://beta.openai.com/account/api-keys"
const __dirname = getDirname()

if (parseFloat(versions.node) < 18 ){
    console.log('Node 18+ required for native fetch.');
    process.exit(1);
}

main()

async function main() {

    let apiKey = await getApiKey()

    const args = argv.slice(2)
    const prompt = args.join(" ")

    switch (prompt) {
        case '':
            console.log("After typing 'gpt' ask a question or request")
            return
        case 'config': 
            openConfig()
            return
        case 'auth':
            await promptAndSaveKey(false)
            return
    }
    
    if (!apiKey) {
        apiKey = await promptAndSaveKey(Boolean(apiKey))
        if (!apiKey) { return }
    }

    const options = {
        ...config,
        prompt,
    }

    const response = await sendCompletionRequest(apiKey, options);
    const result = parseResult(response)

    // output to user
    console.log(result)

    appendLogData(prompt, response)
}

function getDirname() {
    const filename = fileURLToPath(import.meta.url);
    return dirname(filename);
}

async function getApiKey() {
    try {
        const envFile = await fs.readFile(`${__dirname}/.env`, "utf8")
        const regex = new RegExp(`${apiKeyName}=(.+)`)
        const match = regex.exec(envFile)
        const apiKey = match?.[1]
        return apiKey
    } catch (error) {
        return null
    }
}

async function promptAndSaveKey(keySet) {    
    const promptDesc = !keySet ? "not set" : "incorrect"
    console.info(`${apiKeyName} env variable is ${promptDesc}`)

    const {rl, prompt} = createUserPrompt()

    const openDocsResp = await prompt(`Open ${apiKeyUrl} (y/N)? `)
    if (openDocsResp.toLowerCase() == "y") {
        openUrl(apiKeyUrl)
    }

    const apiKey = await prompt('Enter your API Key: ');

    console.log("got" + apiKey)
    rl.close();

    if (!apiKey) { return }

    const secrets = `${apiKeyName}=${apiKey}`
    await fs.writeFile(`${__dirname}/.env`, secrets, "utf8")
    
    return apiKey
}

function createUserPrompt() {
    const rl = createInterface({ input: stdin, output: stdout });
    const prompt = (query) => new Promise((resolve) => rl.question(query, resolve));
    return {rl, prompt}
}

function openUrl(url) {
    cp.exec(`${platformStartCommand()} ${url}`);
}

function platformStartCommand() {
    switch (platform) {
        case 'darwin': return 'open'
        case 'win32': return 'start'
        default: return 'xdg-open'
    }
}

async function sendCompletionRequest(apiKey, config) {
    const spinner = consoleSpinner();

    spinner.start()
    const { resp, data} = await openaiApiCompletions(apiKey, config)
    spinner.stop()

    if (resp.status != 200) {
        if (resp.status == 401) {
            await promptAndSaveKey(true)
        } else {
            await logFailedRequest(config, resp, data)
        }
        process.exit(1);
    }

    return data
}

async function openaiApiCompletions(apiKey, config) {
    const url = "https://api.openai.com/v1/completions"
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };
    const method = 'POST';
    const body = JSON.stringify(config);

    const response = await fetch(url, { headers, method, body })

    const { status, statusText } = response
    const resp = { status, statusText }

    const data = await response.json();

    return { resp, data}
}

function parseResult(data) {
    const choice = data.choices[0]
    const response = choice.text
    const suffix = choice.finish_reason == "length" ? "..." : ""
    return response.replace(/^(\?|any)/, "").trim() + suffix
}

async function appendLogData(prompt, response) {
    const logPath = `${__dirname}/log.json`

    const curLogs = await getLogData(logPath)
    const newLog = { prompt, ...response }
    const newLogs = [...curLogs, newLog]
    
    const logContent = JSON.stringify(newLogs, null, 4) + '\n'
    await fs.writeFile(logPath, logContent, "utf8")
}

async function getLogData(path) {
    try {
        const contents = await fs.readFile(path, "utf8")
        return JSON.parse(contents)
    } catch (error) {
        // file probably doesn't exist, just return empty array
        return []
    }
}

function openConfig() {
    const configFile = `${__dirname}/config.json`
    cp.exec(`code ${configFile}`);
}

async function logFailedRequest(config, resp, data) {
    const errorFilePath = `${__dirname}/error.txt`
    const timestamp = new Date()
    const errorLogData = JSON.stringify({ timestamp, config, resp, data }, null, 2) + "\n\n"

    await fs.appendFile(errorFilePath, errorLogData)
    
    const errorMessage = data?.error?.message || resp?.statusText || "unknown"

    console.log(`Encountered '${errorMessage}' error`)
    console.log(`View full error log details at ${errorFilePath}`)
}

function consoleSpinner() {
    const characters = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
    const cursorEsc = {
        hide: '\u001B[?25l',
        show: '\u001B[?25h',
    }
    stdout.write(cursorEsc.hide)

    let timer;

    const start = () => {
        let i = 0;
        timer = setInterval(function () {
            stdout.write("\r" + characters[i++]);
            i = i >= characters.length ? 0 : i;
        }, 150);
    }

    const stop = () => {
        clearInterval(timer)
        stdout.write("\r")
        stdout.write(cursorEsc.show)
    }

    return {start, stop}
}
