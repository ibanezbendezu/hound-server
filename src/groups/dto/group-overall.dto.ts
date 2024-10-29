export interface SummaryRepositoryDTO {
    id: number;
    name: string;
    owner: string;
    sha: string;
    repositoryLines: number;
    numberOfFiles: number;
}

export interface SummaryPairDTO {
    id: number;
    similarity: number;
    totalOverlap: number;
    longestFragment: number;
}

export interface GroupOverallDTO {
    id: number;
    sha: string;
    date: Date;
    numberOfRepos: number;
    numberOfFiles: number;
    groupLines: number;
    pairs: SummaryPairDTO[];
}
