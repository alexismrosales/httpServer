export default class HTTPUtils {
    data: string;
    content: string;
    contentLength: number;
    header: string;
    headers: { [key: string]: any };

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
        const match = data.match(/^([\s\S]*?)\r\n\r\n/);
        if (match) {
            return match[1]
        }
        throw new Error("Error parsing header");
    }
    private getHeaders(header: string): { [key: string]: any } {
        const parameters: { [key: string]: string } = {
            header: "John"

        }
        return parameters
    }
    private getContentLength(data: string): number {
        const lengthExist = data.match(/Content-Length:\s*(\d+)/i);
        if (lengthExist) {
            return parseInt(lengthExist[1], 10);
        }
        return 0
    }

}

