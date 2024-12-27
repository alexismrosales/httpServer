export default class HTTPUtils {
    private data: string;
    public header: string;

    public content: string;
    public contentLength: number;
    public headers: { [key: string]: any };

    constructor(data: string) {
        this.data = data;
        this.contentLength = this.getContentLength(this.data);
        this.header = this.getHeader(this.data);
        this.content = this.getContent(this.data);
        this.headers = this.getHeaders(this.header);
    }

    private getContent(data: string): string {
        if (this.contentLength > 0) {
            const match = data.match(/\r\n\r\n([\s\S]*)/);
            if (match) {
                return match[1];
            }
            throw new Error("Error finding content from header");
        }
        return "";
    }

    private getHeader(data: string): string {
        console.log("New header:", data);
        const match = data.match(/^([\s\S]*?)\r\n\r\n/);
        if (match) {
            return match[1]
        }
        throw new Error("Error parsing header");
    }

    private getHeaders(header: string): { [key: string]: any } {
        const headerLines = header.split("\r\n");
        const parameters: { [key: string]: string } = {};
        const extras = headerLines[0].split(" ");
        parameters["Method"] = extras[0];
        parameters["Path"] = extras[1] == '/' ? extras[1] : extras[1].slice(1);
        parameters["Extension"] = extras[1].split(".")[1];
        parameters["Version"] = extras[2];
        for (const line of headerLines) {
            if (line.includes(": ")) {
                const [key, val] = line.split(": ");
                parameters[key.trim()] = val.trim();
            }
        }
        return parameters;
    }
    private getContentLength(data: string): number {
        const lengthExist = data.match(/Content-Length:\s*(\d+)/i);
        if (lengthExist) {
            return parseInt(lengthExist[1], 10);
        }
        return 0
    }
}

