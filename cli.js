#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createInterface } from 'readline';
import { stdin , stdout, platform, env, argv  } from 'process';
import { promises as fs } from "fs"
import cp from 'child_process'
import { Configuration, OpenAIApi } from "openai";
import * as dotenv from 'dotenv'
import { config } from './config.js'

const apiKeyName = "OPENAI_API_KEY"
const apiKeyUrl = "https://beta.openai.com/account/api-keys"
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

main()

async function main() {

    dotenv.config({ path: `${__dirname}/.env` });

    let apiKey = env[apiKeyName]

    if (!apiKey) {
        apiKey = await promptAndSaveKey(Boolean(apiKey))
    }
    if (!apiKey) { return }

    const args = argv.slice(2)
    
    const configuration = new Configuration({
        apiKey: apiKey,
    });

    const openai = new OpenAIApi(configuration);
    
    const prompt = args.join(" ")

    if (prompt == "config") {
        openConfig()
        return
    }
    if (prompt == "auth") {
        await promptAndSaveKey(false)
        return
    }

    try {
        const options = {
            ...config,
            prompt,
        }

        const completion = await openai.createCompletion(options);
    
        const result = parseResult(completion)
    
        console.log(result)

        appendLogData(prompt, completion.data)
        
    } catch (error) {
        if (error.response.status == 401) {
            promptAndSaveKey(true)
        } else {
            console.log(error)
        }
    }  
}

async function promptAndSaveKey(keySet) {    
    const promptDesc = !keySet ? "not set" : "incorrect"
    console.info(`${apiKeyName} env variable is ${promptDesc}`)

    const rl = createInterface({ input: stdin, output: stdout });
    const prompt = (query) => new Promise((resolve) => rl.question(query, resolve));
    
    const openDocsResp = await prompt(`Open ${apiKeyUrl} (y/N)? `)
    if (openDocsResp.toLowerCase() == "y") {
        openUrl(apiKeyUrl)
    }

    const apiKey = await prompt('Enter your API Key: ');
    rl.close();

    if (!apiKey) { return }

    const secrets = `${apiKeyName}=${apiKey}`
    fs.writeFile(`${__dirname}/.env`, secrets, "utf8")
    
    return apiKey
}

function openUrl(url) {
    var start = platform == 'darwin' ? 'open'
            : platform == 'win32' ? 'start'
            : 'xdg-open';
    cp.exec(`${start} ${url}`);
}

function parseResult(completion) {
    const choice = completion.data.choices[0]
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
