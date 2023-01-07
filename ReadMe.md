# GPT CLI

```bash
$ gpt write a haiku about winter
Cold winter night
Snowflakes falling from the sky
Peaceful serenity
```

## Commands


```bash
# enter auth key
gpt auth

# customize config
gpt config

# ask question
gpt <your question here>
```

> **Note**
> Be careful with apostrophe's in your question, as they'll likely be interpreted to your shell as string delimiters

You'll need to create and enter your own [API Key](https://beta.openai.com/account/api-keys)


## Logs

Logs are stored to a local `logs.json` file to help you debug info from the response that is not displayed on screen

## Todo

* [ ] Use conversation
* [ ] Zero dependency - use native fetch

## Prior Art

* [ohall/gpt](https://github.com/ohall/gpt)
* [openai-node-cli](https://github.com/mirnes-cajlakovic/openai-node-cli)
* [assistant-cli](https://github.com/diciaup/assistant-cli)
* [openai-cli](https://www.npmjs.com/package/openai-cli)
