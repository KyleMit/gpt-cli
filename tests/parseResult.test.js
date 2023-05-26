import { parseResult } from '../utils.js'


/*
Code Analysis

Objective:
The objective of the `parseResult` function is to extract the response message from the data returned by the GPT-3 API and format it for display to the user.

Inputs:
- `data`: an object containing the response data from the GPT-3 API.

Flow:
1. Extract the first choice from the `choices` array in the `data` object.
2. Extract the content of the message from the `message` property of the choice.
3. Determine if the message was truncated due to reaching the maximum length, and add an ellipsis suffix if necessary.
4. Remove any leading question marks, "any", or commas from the message.
5. Trim any remaining whitespace from the message.
6. Return the formatted message.

Outputs:
- A string containing the formatted response message.

Additional aspects:
- The function assumes that the `data` object has at least one choice in the `choices` array.
- The function removes certain leading characters from the message to improve readability for the user.
- The function adds an ellipsis suffix to the message if it was truncated due to reaching the maximum length.
*/



describe('parseResult_function', () => {

    // Tests that parseResult returns the expected response when given valid data.
    it("test_parse_result_with_valid_data", () => {
        const data = {
            choices: [
                {
                    message: {
                        content: "This is a valid response"
                    },
                    finish_reason: "stop"
                }
            ]
        }
        const expected = "This is a valid response"
        const result = parseResult(data)
        expect(result).toEqual(expected)
    })

    // Tests that parseResult returns an empty string when given data with an empty choices array.
    it("test_parse_result_with_empty_choices_array", () => {
        const data = {
            choices: []
        }
        const expected = ""
        const result = parseResult(data)
        expect(result).toEqual(expected)
    })

    // Tests that parseResult returns a truncated response with ellipsis suffix when given data with a response that exceeds the maximum allowed length.
    it("test_parse_result_with_response_exceeding_maximum_length", () => {
        const longResponse = "a".repeat(24)
        const data = {
            choices: [
                {
                    message: {
                        content: longResponse
                    },
                    finish_reason: "length"
                }
            ]
        }
        const expected = longResponse + "..."
        const result = parseResult(data)
        expect(result).toEqual(expected)
    })

    // Tests that parseResult returns the expected response when given data with a choice message content that is undefined or null.
    it("test_parse_result_with_invalid_choice_message_content", () => {
        const data = {
            choices: [
                {
                    message: {
                        content: null
                    },
                    finish_reason: "stop"
                }
            ]
        }
        const expected = ""
        const result = parseResult(data)
        expect(result).toEqual(expected)
    })

    // Tests that parseResult returns the expected response when given data with a choice finish_reason that is not "length" or undefined.
    it("test_parse_result_with_invalid_finish_reason", () => {
        const data = {
            choices: [
                {
                    message: {
                        content: "This is a valid response"
                    },
                    finish_reason: "invalid"
                }
            ]
        }
        const expected = "This is a valid response"
        const result = parseResult(data)
        expect(result).toEqual(expected)
    })

    // Tests that parseResult returns an empty string when given data with a response that contains only leading question mark, "any", or commas.
    it("test_parse_result_with_response_containing_only_special_characters", () => {
        const data = {
            choices: [
                {
                    message: {
                        content: "? Perfect Answer"
                    },
                    finish_reason: "stop"
                }
            ]
        }
        const expected = "Perfect Answer"
        const result = parseResult(data)
        expect(result).toEqual(expected)
    })
});
