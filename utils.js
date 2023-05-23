export function parseResult(data) {
    const choice = data?.choices[0]
    const response = choice?.message?.content
    const suffix = choice?.finish_reason == "length" ? "..." : ""
    const message = response?.replace(/^(\?|any|,)/, "")?.trim() ?? ""
    return message + suffix
}
