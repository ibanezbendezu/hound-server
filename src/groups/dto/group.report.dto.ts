export interface ClassPairDTO {
    id: number;
    similarity: number;
    totalOverlap: number;
    normalizedImpact: number;
    longestFragment: number;
    filepath: string;
    sha: string;
    repositoryId: number;
    repositoryName: string;
    repositoryOwner: string;
}

export interface FileReportDTO {
    id: number;
    filepath: string;
    class: string;
    sha: string;
    lineCount: number;
    classMatch: number;
    top: {
        similarity: number;
        filepath: string;
        repositoryName: string;
        repositoryOwner: string;
    };
    pairs: ClassPairDTO[];
}

export interface ClassReportDTO {
    name: string;
    averageMatch: number;
    standardDeviation: number;
    numberOfFiles: number;
    classLines: number;
    class: string;
    files: FileReportDTO[];
}

export interface ReportRepositoryDTO {
    id: number;
    name: string;
    owner: string;
    sha: string;
    repositoryLines: number;
    numberOfFiles: number;
    classes: ClassReportDTO[];
}

export interface GroupReportDTO {
    id: number;
    sha: string;
    date: Date;
    numberOfRepos: number;
    numberOfFiles: number;
    groupLines: number;
    repositories: ReportRepositoryDTO[];
}
