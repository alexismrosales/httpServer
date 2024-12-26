import { getAllFilesSync } from 'get-all-files';
import { promises as fs } from 'fs';
import path from 'path';
// listFiles() returns Files[string]
// getFile(nameFile) returns File
// createFile(nameFile, content: bytes) returns Boolean
// updateFile(nameFile) returns Boolean
// deleteFile(nameFile) returns Boolean 
// updateFiles
export default class FileManager {
    private resourcesPath: string;
    private files: string[] = [];

    constructor(resourcesPath: string) {
        this.resourcesPath = resourcesPath;
        this.files = this.getAllFiles();
    }

    public updateFiles(): void {
        this.files = this.getAllFiles();
    }

    public listFiles(): string[] {
        this.updateFiles();
        return this.files;
    }

    public async getFile(fileName: string): Promise<Buffer | null> {
        if (!this.files.includes(fileName)) {
            console.error(`File: ${fileName}`);
            return null;
        }

        const filePath = path.join(this.resourcesPath, fileName);
        // TODO: searchFile from path resourcesPath+/+/nameFile 
        // and return array of data
        try {
            const data = await fs.readFile(filePath);
            return data
        }
        catch (err) {
            console.error("Error reading file from: ", filePath, err);
            throw new Error(`Could not read file: ${err}`);
        }
    }

    private getAllFiles(): string[] {
        const filesPaths: string[] = getAllFilesSync(this.resourcesPath).toArray();
        let files: string[] = [];
        for (const file of filesPaths) {
            const nameFile = file.substring(file.lastIndexOf("/") + 1)
            files.push(nameFile)
        }
        return files;
    }
}
