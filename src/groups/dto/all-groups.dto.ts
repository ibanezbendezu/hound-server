export interface RepositoryDTO {
    id: number;
    name: string;
    owner: string;
    sha: string;
    totalLines: number;
}

export interface PairDTO {
    id: number;
    similarity: number;
}

export interface ComparisonDTO {
    repositories: RepositoryDTO[];
    pairs: PairDTO[];
}

export interface GroupDTO {
    id: number;
    sha: string;
    groupDate: Date;
    numberOfRepos: number;
    comparisons: ComparisonDTO[];
}
