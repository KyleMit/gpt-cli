#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createInterface } from 'readline';
import process, { stdin , stdout, platform, argv } from 'process';
import { promises as fs } from "fs"
import { spawn, exec } from 'child_process'
import https from 'https';

import { parseResult } from './utils.js'
import { config } from './config.js'

const apiKeyName = "OPENAI_API_KEY"
const apiKeyUrl = "https://beta.openai.com/account/api-keys"
const __dirname = getDirname()

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

    const pastMessages = await getPastMessages()

    const systemPrompt = { role: "system", content: "You are CLI-GPT. A system that answers user input with helpful and short responses.  You do not need to reference the fact that you are an AI. Only provide answers to the best of your ability." }
    
    const currentPrompt = {role:"user", content: prompt}

    const messages = [
        ...pastMessages,
        currentPrompt,
        systemPrompt,
    ]

    const options = {
        ...config,
        messages
    }

    const response = await sendCompletionRequest(apiKey, options);
    const result = parseResult(response)

    // output to user
    console.log(result)

    appendLogData(prompt, response)
}

async function getPastMessages() {
    const logPath = `${__dirname}/log.json`

    const curLogs = await getLogData(logPath)

    const recentTimeStamp = new Date()
    recentTimeStamp.setMinutes(recentTimeStamp.getMinutes() - 5)
    const recentTimeMs = recentTimeStamp.getTime()

    const recentLogs = curLogs.filter(l => (l.created * 1000) > recentTimeMs)

    const topRecentLogs = recentLogs.slice(-5)

    // https://platform.openai.com/docs/api-reference/chat/create#chat/create-messages
    const messages = topRecentLogs.flatMap(l => ([
        { role: "user", content: l.prompt },
        { role: "assistant", content: l.choices[0].text ?? l.choices[0].message.content }
    ]))

    return messages
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
    exec(`${platformStartCommand()} ${url}`);
}

function platformStartCommand() {
    switch (platform) {
        case 'darwin': return 'open'
        case 'win32': return 'start'
        default: return 'xdg-open'
    }
}

async function sendCompletionRequest(apiKey, options) {
    const spinner = consoleSpinner();

    spinner.start()
    const { statusCode, data} = await openaiApiCompletions(apiKey, options)
    spinner.stop()

    if (statusCode != 200) {
        if (statusCode == 401) {
            await promptAndSaveKey(true)
        } else {
            await logFailedRequest(options, statusCode, data)
        }
        process.exit(1);
    }

    return data
}


async function openaiApiCompletions(apiKey, options) {
    const url = "https://api.openai.com/v1/chat/completions"

    const response = await post(url, options, apiKey);
    return response
}


function post(url, data, apiKey) {
    const dataString = JSON.stringify(data)

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': dataString.length,
            'Authorization': `Bearer ${apiKey}`
        },
        timeout: 10 * 1000, // in ms
    }

    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            const statusCode = res.statusCode
            if (statusCode < 200 || statusCode > 299) {
                return reject(new Error(`HTTP status code ${statusCode}`))
            }

            const body = []
            res.on('data', (chunk) => body.push(chunk))
            res.on('end', () => {
                const respString = Buffer.concat(body).toString()
                const data = JSON.parse(respString)
                resolve({ statusCode, data })
            })
        })

        req.on('error', (err) => {
            reject(err)
        })

        req.on('timeout', () => {
            req.destroy()
            reject(new Error('Request time out'))
        })

        req.write(dataString)
        req.end()
    })
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
    const configFile = `${__dirname}\\config.js`
    const args = [configFile]
    spawn("code", args, { shell: true });
}

async function logFailedRequest(options, statusCode, data) {
    const errorFilePath = `${__dirname}/error.txt`
    const timestamp = new Date()
    const errorLogData = JSON.stringify({ timestamp, options, statusCode, data }, null, 2) + "\n\n"

    await fs.appendFile(errorFilePath, errorLogData)
    
    const errorMessage = data?.error?.message || statusCode || "unknown"

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
