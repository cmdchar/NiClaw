export function searchWeb(query: string) {
    return {
        action: "open_url",
        url: "https://www.google.com/search?q=" + encodeURIComponent(query),
        text: "Am căutat pe Google: " + query
    };
}
