# GPT CLI

```bash
$ gpt write a haiku about winter
Cold winter night
Snowflakes falling from the sky
Peaceful serenity
```

## Input

To customize output, run:

```bash
gpt config
```


Will auto prompt to enter [API Key](https://beta.openai.com/account/api-keys) if not found in `.env` file


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
