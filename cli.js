#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Configuration, OpenAIApi } from "openai";
import * as dotenv from 'dotenv'
import { promises as fs } from "fs"


async function main() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    dotenv.config({ path: `${__dirname}/.env` });

    if (!process.env.OPENAI_API_KEY) {
        console.log("OPENAI_API_KEY env variable is not set")
        return
    }

    const [,, ...args] = process.argv
    
    const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
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
        console.log(error)
    }
    
}

main()
