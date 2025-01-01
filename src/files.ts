import { getAllFilesSync } from 'get-all-files';
import { promises as fs } from 'fs';
import path from 'path';
import { throws } from 'assert';
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
        if (!this.fileExist(fileName)) {
            return null;
        }
        const filePath = path.join(this.resourcesPath, fileName);
        try {
            const data = await fs.readFile(filePath);
            return data
        }
        catch (err) {
            console.error("Error reading file from: ", filePath, err);
            throw new Error(`Could not read file: ${err}`);
        }
    }


    public async writeFile(fileName: string, data: string | Buffer): Promise<void> {
        const filePath = path.join(this.resourcesPath, fileName);
        try {
            await fs.writeFile(filePath, data);
            console.log("written in: ", filePath)
        }
        catch (err) {
            console.error("Error writing file: ", err);
            throw new Error(`Could not write file: ${err}`);
        }
    }

    public async deleteFile(fileName: string): Promise<void> {
        if (!this.fileExist(fileName)) {
            return;
        }
        const filePath = path.join(this.resourcesPath, fileName);
        console.log("Trying to delete...")
        try {
            await fs.rm(filePath);
            console.log("Deleted file: ", filePath);
        } catch (error) {
            throw new Error(`Could not deleted file: ${error}`);
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

    private fileExist(fileName: string): boolean {
        if (!this.files.includes(fileName.substring(fileName.lastIndexOf('/') + 1))) {
            console.error(`Error with file: ${fileName}`);
            return false;
        }
        return true;
    }
}
