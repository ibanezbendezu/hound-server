import { Report } from "./report.js";
import { CustomOptions, Options } from "./options.js";
import { Tokenizer } from "./tokenizer/tokenizer.js";
import { Language, LanguagePicker } from "./language.js";
import { FingerprintIndex, File } from "../core/";


export class Dolos {
    readonly options: Options;

    private languageDetected = false;
    private language: Language | null = null;
    private tokenizer: Tokenizer | null = null;
    private index: FingerprintIndex | null = null;

    private readonly languagePicker = new LanguagePicker();

    constructor(customOptions?: CustomOptions) {
        this.options = new Options(customOptions);
    }

    public async stringsToFiles(filesData: { path: string; content: string; sha: string; type: string }[]): Promise<{ file: File; sha: string; type: string }[]> {
        return filesData.map(fileData => ({
            file: new File(fileData.path, fileData.content, fileData.sha),
            sha: fileData.sha,
            type: fileData.type,
        }));
    }

    public async analyzeFromString(filesData: { path: string; content: string }[]): Promise<Report> {
        const files = filesData.map(fileData => new File(fileData.path, fileData.content));
        return this.analyze(files);
    }

    public async analyze(
        files: Array<File>,
        nameCandidate?: string
    ): Promise<Report> {

        if (this.index == null) {
            if (this.options.language) {
                this.language = await this.languagePicker.findLanguage(this.options.language);
            } else {
                this.language = this.languagePicker.detectLanguage(files);
                this.languageDetected = true;
            }
            this.tokenizer = await this.language.createTokenizer();
            this.index = new FingerprintIndex(this.options.kgramLength, this.options.kgramsInWindow, this.options.kgramData);
        }

        const warnings = [];
        let filteredFiles;
        if (this.languageDetected) {
            filteredFiles = files.filter(file => this.language?.extensionMatches(file.path));
            const diff = files.length - filteredFiles.length;
            if (diff > 0) {
                warnings.push(
                    `The language of the files was detected as ${this.language?.name} ` +
                    `but ${diff} files were ignored because they did not have a matching extension.` +
                    "You can override this behavior by setting the language explicitly."
                );
            }
        } else {
            filteredFiles = files;
        }

        if (files.length < 2) {
            throw new Error("You need to supply at least two files");
        } else if (files.length == 2 && this.options.maxFingerprintPercentage !== null) {
            throw new Error("You have given a maximum hash percentage but your are " +
                "comparing two files. Each matching hash will thus " +
                "be present in 100% of the files. This option does only" +
                "make sense when comparing more than two files.");
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const tokenizedFiles = filteredFiles.map(f => this.tokenizer!.tokenizeFile(f));
        this.index.addFiles(tokenizedFiles);

        return new Report(
            this.options,
            this.language,
            tokenizedFiles,
            this.index,
            nameCandidate,
            warnings
        );
    }
}
