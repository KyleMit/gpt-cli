#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createInterface } from 'readline';
import { stdin , stdout } from 'process';
import { promises as fs } from "fs"
import { Configuration, OpenAIApi } from "openai";
import * as dotenv from 'dotenv'

const apiKeyName = "OPENAI_API_KEY"
const apiKeyUrl = "https://beta.openai.com/account/api-keys"
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

main()

async function main() {

    dotenv.config({ path: `${__dirname}/.env` });

    let apiKey = process.env[apiKeyName]

    if (!apiKey) {
        apiKey = await promptAndSaveKey(Boolean(apiKey))
    }

    const args = process.argv.slice(2)
    
    const configuration = new Configuration({
        apiKey: apiKey,
    });

    const openai = new OpenAIApi(configuration);
    
    const prompt = args.join(" ")

    try {
        const completion = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: prompt,
            temperature: 0.6,
            max_tokens: 40
        });
    
        const choice = completion.data.choices[0]
        const response = choice.text
        const suffix = choice.finish_reason == "length" ? "..." : ""
        const result = response.replace(/^(\?|any)/, "").trim() + suffix
    
        console.log(result)
    
        const logName = `${__dirname}/log.json`
        const logData = { prompt, ...completion.data }
        const logEntry = JSON.stringify(logData, null, 4) + ',\n'
        fs.appendFile(logName, logEntry)

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
    console.log(`${apiKeyName} env variable is ${promptDesc} - generate from ${apiKeyUrl}`)

    const rl = createInterface({ input: stdin, output: stdout });
    const prompt = (query) => new Promise((resolve) => rl.question(query, resolve));
    const apiKey = await prompt('Enter your API Key: ');
    rl.close();

    const secrets = `${apiKeyName}=${apiKey}`
    fs.writeFile(`${__dirname}/.env`, secrets, { encoding: 'utf-8' })
    
    return apiKey
}
